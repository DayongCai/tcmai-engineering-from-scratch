'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  occlusionGrid,
  deletionCurve,
  upsample,
  quizAudit,
} = require('./main.js');

test('遮挡网格从正文读出：8×8 共 64 块、每次 5 块、13 步', () => {
  const g = occlusionGrid();
  assert.strictEqual(g.w, 8);
  assert.strictEqual(g.h, 8);
  assert.strictEqual(g.cells, 64);
  assert.strictEqual(g.perStep, 5);
  assert.strictEqual(g.steps, 13);
  assert.strictEqual(g.consistent, true);
});

test('删除曲线三组：高显著 42%、随机 12%、最低 4%', () => {
  const d = deletionCurve();
  assert.strictEqual(d.high, 42);
  assert.strictEqual(d.random, 12);
  assert.strictEqual(d.low, 4);
  assert.ok(docText().includes('42%') && docText().includes('12%') && docText().includes('4%'));
});

test('「解释有效」的判据：删高显著区掉得比随机快得多', () => {
  const d = deletionCurve();
  assert.strictEqual(d.ordered, true);
  assert.strictEqual(d.ratio, 3.5);
  assert.strictEqual(d.informative, true);
});

test('反例：若高显著与随机持平，则热图没有信息量', () => {
  const d = deletionCurve();
  const flat = { high: 12, random: 12 };
  assert.ok(!(flat.high >= 2 * flat.random), '持平不应被判为有信息量');
  assert.ok(d.high > 3 * flat.high, '正文的算例应明显高于持平情形');
});

test('类激活图 7×7 上采样到 224×224：倍率 32，格子数放大 1024 倍', () => {
  const u = upsample();
  assert.strictEqual(u.src, 7);
  assert.strictEqual(u.dst, 224);
  assert.strictEqual(u.factor, 32);
  assert.strictEqual(u.srcCells, 49);
  assert.strictEqual(u.dstCells, 50176);
  assert.strictEqual(u.dstCells / u.srcCells, 1024);
});

test('习题结构：6 题、pre 1 / check 3 / post 2、每题 4 选项', () => {
  const a = quizAudit();
  assert.strictEqual(a.total, 6);
  assert.deepStrictEqual(a.byStage, { pre: 1, check: 3, post: 2 });
  assert.deepStrictEqual(a.problems, []);
  for (const item of quizData().questions) {
    assert.strictEqual(new Set(item.options).size, 4, `选项有重复：${item.question}`);
  }
});

test('三道 check 题全部接地：正确选项能在正文找到原词', () => {
  const a = quizAudit();
  assert.strictEqual(a.grounded, 3);
  assert.ok(a.grounded >= 2);
});

test('解释都过 30 汉字，且不复述题干', () => {
  for (const item of quizData().questions) {
    assert.ok(hanzi(item.explain) >= 30, `解释过短：${item.question}`);
    assert.ok(!item.explain.includes(item.question), '解释不应整句复述题干');
  }
});

test('正确选项用词在正文里能逐字对上（不是自造术语）', () => {
  const body = grams(docText());
  for (const item of quizData().questions) {
    const right = item.options[item.correct];
    assert.ok([...grams(right)].some((g) => body.has(g)), `正确选项在正文找不到：${right}`);
  }
});

test('免责一行在正文里明确写死：不存在这种用途', () => {
  const t = docText();
  assert.ok(t.includes('免责'));
  assert.ok(t.includes('这种用途'), '正文应写明免责不是一种用途');
});

test('答案分散在四个位置，不是全押同一项', () => {
  const idx = quizData().questions.map((q) => q.correct);
  assert.strictEqual(new Set(idx).size, 4, `correct 分布：${idx.join(',')}`);
});
