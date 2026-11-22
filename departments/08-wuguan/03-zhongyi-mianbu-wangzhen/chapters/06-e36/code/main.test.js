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
  pieces,
  manuscriptTotal,
  pseudomembrane,
  outputColumns,
  captureLimits,
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

test('小节结构：七个二级标题，前六节按一至六编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.strictEqual(titles[6], '代价与边界');
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  assert.strictEqual(r.probes.length, SECTION_PROBES.length);
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('表格：一张四列部位表，七个部位行', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  assert.deepStrictEqual(blocks[0].head, ['部位', '篇数', '有无「形容提纲」', '有无「气色条目」']);
  for (const row of blocks[0].rows) assert.strictEqual(row.length, 4);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('篇数逐行相加：目 7、舌 5、唇 3（另四白 1）、齿 2、鼻 2、耳 1、咽喉 0', () => {
  const p = pieces(readDoc());
  assert.deepStrictEqual(p.rows.map((r) => r.part), ['目', '舌', '唇', '齿', '鼻', '耳', '咽喉']);
  assert.deepStrictEqual(p.rows.map((r) => r.pieces), [7, 5, 3, 2, 2, 1, 0]);
  const lip = p.rows.find((r) => r.part === '唇');
  assert.strictEqual(lip.extra, 1, '唇那一格应带「＋四白 1」的括注');
  assert.strictEqual(p.sum, 20);
  assert.deepStrictEqual(p.zero, ['咽喉']);
});

test('底本自称一百零一篇；有形容提纲的六处，有气色条目的五处（耳缺气色）', () => {
  assert.strictEqual(manuscriptTotal(readDoc()), 101);
  const p = pieces(readDoc());
  assert.deepStrictEqual(p.withShape, ['目', '舌', '唇', '齿', '鼻', '耳']);
  assert.deepStrictEqual(p.withColour, ['目', '舌', '唇', '齿', '鼻']);
  assert.ok(!p.withColour.includes('耳'), '耳那一格写的是「—」');
});

test('伪膜四条特征齐：灰白色、附着、不易擦去、强行擦去易出血', () => {
  const ps = pseudomembrane(readDoc());
  assert.strictEqual(ps.features.length, 4, ps.raw);
  assert.ok(ps.raw.includes('白喉'), '伪膜那条应点名白喉');
  assert.ok(readDoc().includes('唯一正确的输出就是升级，不是分类'), '缺「升级不是分类」那句');
  assert.ok(readDoc().includes('分诊器'), '缺分诊器的定位');
});

test('输出三栏：看到的、听到的、问到的', () => {
  const c = outputColumns(readDoc());
  assert.strictEqual(c.count, 3);
  assert.deepStrictEqual(c.columns.map((x) => x.name), ['看到的', '听到的', '问到的']);
  assert.ok(c.columns[0].content.includes('伪膜'), '第一栏应含伪膜');
  assert.ok(c.columns[1].content.includes('音色'), '第二栏应含音色');
  assert.ok(c.columns[2].content.includes('主诉'), '第三栏应含主诉');
});

test('采集四条不可能 + 咽部照度 100 勒克斯 + 喉核四度分法', () => {
  const l = captureLimits(readDoc());
  assert.deepStrictEqual(l.items, ['咽反射', '儿童', '照度与噪声', '视角改变解剖']);
  assert.strictEqual(l.lux, 100);
  assert.strictEqual(l.degrees, true);
  assert.ok(sectionAt(readDoc(), 4).includes('同时记录'), '第 5 节缺「同时记录」那个可检验的实验');
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

test('quiz 考的是正文的判断：零篇与可达性、靠形不靠色、伪膜升级', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const all = q.questions.map((x) => String(x.options[x.correct]));
  assert.ok(all.some((s) => s.includes('阙上者，咽喉也')), '缺「零篇」那道');
  assert.ok(all.some((s) => s.includes('可达性') || s.includes('压舌板')), '缺「可达性」那道');
  assert.ok(all.some((s) => s.includes('结构性')), '缺「靠形不靠色」那道');
  assert.ok(all.some((s) => s.includes('白喉')), '缺「伪膜升级」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /零篇的部位：咽喉/);
});
