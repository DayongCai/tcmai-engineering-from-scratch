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
  lipParts,
  shapeAxes,
  lipFigures,
  toothRule,
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

test('两张表：唇红／唇四白对照（5 行）与 三轴表（3 行）', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  const b0 = blocks.find((b) => b.head.includes('唇四白'));
  assert.deepStrictEqual(b0.head.filter(Boolean), ['唇红', '唇四白']);
  for (const row of b0.rows) assert.strictEqual(row.length, 3);
  const b1 = blocks.find((b) => b.head[0] === '轴');
  assert.deepStrictEqual(b1.head, ['轴', '十二条中的对应', '可测参数']);
  for (const row of b1.rows) assert.strictEqual(row.length, 3);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('唇的两块：唇红无角质层、四白是口周皮肤', () => {
  const lip = lipParts(readDoc());
  assert.ok(lip.thickness.hong.includes('极薄'), '唇红应标极薄');
  assert.ok(lip.cell('解剖').hong.includes('黏膜移行部'), '唇红解剖应是黏膜移行部');
  assert.strictEqual(lip.thickness.sibai, '正常皮肤');
  assert.ok(lip.saturation.hong.includes('高'), '唇红色饱和度应标高');
  assert.ok(lip.saturation.sibai.includes('低'), '四白色饱和度应标低');
  assert.ok(lip.interference.hong.includes('口红'), '唇红主要干扰应含口红');
  assert.ok(lip.interference.sibai.includes('日晒'), '四白主要干扰应含日晒');
});

test('形变逐项清点：三个轴共收 13 项，与正文列举一致', () => {
  const s = shapeAxes(readDoc());
  assert.strictEqual(s.listed.length, 13, s.listed.join('、'));
  assert.strictEqual(s.claim, 12, '正文字面写的是「十二种形变」');
  assert.strictEqual(s.covered, 13);
  assert.deepStrictEqual(s.axes.map((a) => a.axis), ['体积', '连续性', '位置与张力']);
  assert.deepStrictEqual(s.axes.map((a) => a.count), [4, 6, 3]);
  const union = new Set(s.axes.flatMap((a) => a.items));
  for (const x of s.listed) assert.ok(union.has(x), `轴表漏掉「${x}」`);
});

test('口红量级：a* 差二十，三档跨度八到十', () => {
  const f = lipFigures(readDoc());
  assert.strictEqual(f.rougeDelta, 20);
  assert.deepStrictEqual(f.span, [8, 10]);
  assert.ok(f.rougeDelta > f.span[1], '口红的差应大于三档跨度，否则推不过三档');
  assert.strictEqual(f.poseLoss, '三成');
  assert.ok(readDoc().includes('足以把判断推过三档'), '缺「推过三档」那句');
});

test('齿：常态先讲年龄，病变判「忽」不判「是」', () => {
  const t = toothRule(readDoc());
  assert.strictEqual(t.normal, true);
  assert.strictEqual(t.sudden, true);
  assert.strictEqual(t.caution, true);
  const doc = readDoc();
  assert.ok(doc.includes('齿色黄者长也，色白者幼也。是皆长幼之常，非疾病之变也'), '缺常态原话');
  assert.ok(doc.includes('跨部位复用'), '缺跨部位复用的判断');
});

test('方位约定在正文：左病应在左，上应乎上', () => {
  const sec = sectionAt(readDoc(), 2);
  assert.ok(sec.includes('左病者应在左，右病者应在右'), '缺方位约定');
  assert.ok(sec.includes('上应乎上，下应乎下'), '缺上下对应');
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

test('quiz 考的是正文的判断：四白与唇红之分、判忽不判是、三轴', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const all = q.questions.map((x) => String(x.options[x.correct]));
  assert.ok(all.some((s) => /四周|口周/.test(s) && s.includes('唇红')), '缺「四白不是唇红」那道');
  assert.ok(all.some((s) => s.includes('忽') || s.includes('基线')), '缺「判忽不判是」那道');
  assert.ok(all.some((s) => s.includes('体积') && s.includes('连续性')), '缺「三轴」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /a\* 差 20 个单位以上/);
});
