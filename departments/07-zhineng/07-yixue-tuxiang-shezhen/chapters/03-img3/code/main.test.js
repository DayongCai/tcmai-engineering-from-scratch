'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  pcaShare,
  lbpDims,
  sampleNeed,
  quizAudit,
} = require('./main.js');

test('前三个特征值与迹从正文读出：7.8 / 4.2 / 3.6，迹 20', () => {
  const p = pcaShare();
  assert.deepStrictEqual(p.ev, [7.8, 4.2, 3.6]);
  assert.strictEqual(p.trace, 20);
});

test('解释比例现算 78%，与正文的累计 15.6 与 78% 一致', () => {
  const p = pcaShare();
  assert.ok(Math.abs(p.sum - 15.6) < 1e-9);
  assert.strictEqual(p.claimed, p.sum);
  assert.strictEqual((p.share * 100).toFixed(0), '78');
  assert.ok(docText().includes('78%'));
});

test('未解释方差 22%，就是正文说的「可能藏着判别方向」的那部分', () => {
  const p = pcaShare();
  assert.strictEqual((p.unexplained * 100).toFixed(0), '22');
  assert.ok(docText().includes('22%'));
});

test('LBP 维数：58 类加一类杂项共 59 维，3×3 网格后 531 维', () => {
  const l = lbpDims();
  assert.strictEqual(l.base, 59);
  assert.strictEqual(l.cells, 9);
  assert.strictEqual(l.base * l.cells, l.grid);
  assert.strictEqual(l.grid, 531);
  assert.ok(docText().includes('531'));
});

test('40 维特征按每特征 10–20 例，需要 400–800 例', () => {
  const s = sampleNeed();
  assert.strictEqual(s.dims, 40);
  assert.deepStrictEqual(s.perFeature, [10, 20]);
  assert.strictEqual(s.lo, 400);
  assert.strictEqual(s.hi, 800);
  assert.ok(docText().includes('400–800'));
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

test('答案分散在四个位置，不是全押同一项', () => {
  const idx = quizData().questions.map((q) => q.correct);
  assert.strictEqual(new Set(idx).size, 4, `correct 分布：${idx.join(',')}`);
});
