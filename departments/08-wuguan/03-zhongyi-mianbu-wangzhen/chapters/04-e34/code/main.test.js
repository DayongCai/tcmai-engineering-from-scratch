'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  sectionAt,
  noseClauses,
  staticTicks,
  recordFields,
  CHAPTER,
  SLUG,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与章号一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：八个二级标题，前七节按一至七编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 8, `小节数 ${titles.length}`);
  assert.strictEqual(titles[7], '代价与边界');
  assert.ok(titles.slice(0, 7).every((t) => /^[一二三四五六七]、/.test(t)), '前七节未按一至七编号');
  assert.ok(titles[5].includes('疠风'), '第 6 节应是转诊规则那一节');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  assert.strictEqual(r.probes.length, SECTION_PROBES.length);
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('两张表：判据／正面静态／侧面／视频／微距（12 行）与 字段表（6 行）', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  assert.deepStrictEqual(blocks.map((b) => b.head.length), [5, 4]);
  assert.deepStrictEqual(blocks[0].head, ['判据', '正面静态', '侧面', '视频', '微距']);
  assert.deepStrictEqual(blocks[1].head, ['字段', '取值', '来源', '覆盖判据']);
  for (const b of blocks) for (const row of b.rows) assert.strictEqual(row.length, b.head.length);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('二十二条 = 十七条形与证 + 五条色；正面静态可得九条', () => {
  const c = noseClauses(readDoc());
  assert.strictEqual(c.shapes.length, 17, c.shapes.join('、'));
  assert.strictEqual(c.colours.length, 5);
  assert.strictEqual(c.total, 22);
  assert.strictEqual(c.claim, 22, '正文自称的条数与清点结果不符');
  assert.deepStrictEqual(c.staticShapes, ['大小', '肿陷', '枯槁', '蚀烂']);
  assert.strictEqual(c.reachable, 9);
  assert.ok(c.reachable < c.total, '可得条数不应等于总条数');
  for (const x of ['鼻煽张', '鼻仰息', '鼻柱崩坏', '鼻渊', '鼻衄']) assert.ok(c.shapes.includes(x), '缺 ' + x);
});

test('九/二十二 ≈ 四成，且是判据可得性而非性能', () => {
  const r = analyze();
  assert.ok(Math.abs(r.ratio - 9 / 22) < 1e-9);
  assert.ok(r.ratio > 0.4 && r.ratio < 0.42, `比例 ${r.ratio}`);
  const t = readDoc();
  assert.ok(t.includes('「四成」（九条／二十二条）是判据可得性的比例，不是性能'), '缺「不是性能」的声明');
});

test('判据表里正面静态打勾七行，覆盖十六项中的一部分', () => {
  const k = staticTicks(readDoc());
  assert.strictEqual(k.column, 1);
  assert.strictEqual(k.count, 7, k.ticks.join('；'));
  for (const x of ['鼻大／鼻小', '鼻枯槁', '鼻蚀烂', '鼻柱崩坏']) assert.ok(k.ticks.includes(x), '缺 ' + x);
  assert.ok(!k.ticks.some((x) => x.includes('鼻煽张')), '鼻煽张不应出现在正面静态列');
});

test('六个字段里只有色与泽完全来自静态图像', () => {
  const f = recordFields(readDoc());
  assert.strictEqual(f.rows.length, 6);
  assert.deepStrictEqual(f.staticOnly, ['色', '泽']);
  const dynamic = f.rows.find((r) => r.field === '动态');
  assert.ok(dynamic.source.includes('视频'), '动态字段应标视频');
  const secretion = f.rows.find((r) => r.field === '分泌物');
  assert.ok(secretion.source.includes('问诊'), '分泌物字段应标问诊');
});

test('本章的三条关键判断都在正文：稳定优先、色＋兼症合取、转诊优先于分类', () => {
  const t = readDoc();
  assert.ok(t.includes('稳定优先于丰富'), '缺「稳定优先于丰富」');
  assert.ok(t.includes('每一条都是「色＋兼症」的合取'), '缺「色＋兼症」');
  assert.ok(t.includes('漏掉一个结构缺损的代价，远大于把一百张正常照片判成可疑'), '缺代价不对称那句');
  assert.ok(sectionAt(t, 5).includes('建议立即就医'), '第 6 节缺转诊输出');
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
});

test('答案位置打散：用到三个以上不同下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `只用到 ${new Set(idx).size} 个位置`);
});

test('quiz 的 check 题：道道能在正文里对上两个以上四字原词', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.check, 3);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length >= 2, `未接地：${h.question}`);
});

test('quiz 考的是正文的判断：四成、稳定优先、色＋兼症', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const right = q.questions.filter((x) => x.stage === 'check').map((x) => String(x.options[x.correct]));
  assert.ok(right.some((s) => s.includes('稳定优先于丰富')), '缺「稳定优先」那道');
  assert.ok(right.some((s) => s.includes('合取')), '缺「色＋兼症」那道');
  assert.ok(right.some((s) => s.includes('呼吸频率')), '缺「鼻煽张要视频」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /40\.9%/);
});
