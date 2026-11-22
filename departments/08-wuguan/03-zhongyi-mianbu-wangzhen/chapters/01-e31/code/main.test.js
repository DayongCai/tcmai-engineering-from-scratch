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
  grams,
  sectionAt,
  partNames,
  vertexFigure,
  boundaryError,
  CHAPTER,
  SLUG,
  DOC,
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

test('小节结构：六个二级标题，前五节按一至五编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  assert.strictEqual(r.probes.length, SECTION_PROBES.length);
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('表格：一张三列表，数据行数与正文现算一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  const b = blocks[0];
  assert.strictEqual(b.head.length, 3);
  assert.deepStrictEqual(b.head, ['轴', '原文判据', '可测的对应物']);
  for (const row of b.rows) assert.strictEqual(row.length, b.head.length, '数据行列数与表头不符');
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('部位名清单：正文 PROBLEM 段逐个点出 21 个名字', () => {
  const parts = partNames(readDoc());
  assert.strictEqual(parts.length, 21, parts.join('、'));
  for (const x of ['庭', '阙上', '阙中', '下极', '面王以上', '面王以下', '巨屈']) {
    assert.ok(parts.includes(x), '清单缺 ' + x);
  }
});

test('边界：正文明确说部位的边界一条也没有写', () => {
  const r = analyze();
  assert.strictEqual(r.noBoundary, true, '正文未声明边界缺失');
  assert.ok(sectionAt(readDoc(), 0).includes('犹脉之出于气口'), '第 1 节讲明堂取窗的那句不在');
});

test('顶点演算：24 个部位 × 4 个顶点 = 96；±15 / 180 ≈ 8%', () => {
  const text = readDoc();
  const fig = vertexFigure(text);
  assert.strictEqual(fig.parts, 24);
  assert.strictEqual(fig.perPart, 4);
  assert.strictEqual(fig.vertices, 96);
  assert.strictEqual(fig.parts * fig.perPart, fig.vertices, '顶点数与乘法结果不符');
  const err = boundaryError(text);
  assert.deepStrictEqual(err, { offsetPx: 15, nosePx: 180, pct: 8 });
  assert.strictEqual(Math.round((err.offsetPx / err.nosePx) * 100), err.pct);
});

test('操作顺序写死在正文：部位 → 采集 → 颜色 → 判据', () => {
  const t = readDoc();
  assert.ok(t.includes('部位 → 采集 → 颜色 → 判据'), '缺操作顺序');
  assert.ok(t.includes('不是「看一张脸」'), '缺「不是看一张脸」的判断');
  assert.ok(t.includes('一套公开的命名约定'), '缺命名约定的立场');
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

test('答案位置打散：正确项不集中在同一个下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `只用到 ${new Set(idx).size} 个位置`);
  assert.ok(idx.filter((i) => i === 0).length <= 2, '0 号位过多');
});

test('quiz 的 check 题：道道能在正文里对上两个以上四字原词', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.check, 3);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) {
    assert.ok(h.grams.length >= 2, `未接地：${h.question}`);
  }
});

test('quiz 考的是正文的判断，不是名目复述', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const right = q.questions.filter((x) => x.stage === 'check').map((x) => String(x.options[x.correct]));
  assert.ok(right.some((s) => s.includes('一条也没有写')), '缺「边界缺失」那道');
  assert.ok(right.some((s) => s.includes('色锋')), '缺「色锋」那道');
  assert.ok(right.some((s) => /命名约定|男女异位/.test(s)), '缺「约定不是解剖」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /边界一条也没有写/);
});
