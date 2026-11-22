'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  varRatio,
  varianceTable,
  fiveModelCase,
  quizAudit,
} = require('./main.js');

test('方差比的三个极端：ρ=0 到 1/M，ρ=1 不动，ρ 越大收益越小', () => {
  assert.strictEqual(varRatio(0, 5), 0.2);
  assert.strictEqual(varRatio(1, 5), 1);
  assert.ok(varRatio(0.6, 5) > varRatio(0.6, 10), '同一相关性下成员越多越好');
  assert.ok(varRatio(0.9, 5) > varRatio(0.6, 5), '相关性越高收益越小');
});

test('正文那张表由 ρ 行与 M 列解析，逐格与自报值一致', () => {
  const t = varianceTable();
  assert.deepStrictEqual(t.ms, [3, 5, 10]);
  assert.deepStrictEqual(t.rows.map((r) => r.rho), [0, 0.6, 0.9]);
  for (const r of t.rows) assert.ok(r.ok, `ρ=${r.rho} 的格子与现算不一致`);
});

test('ρ=0.6、M=5 的格子是 0.680，正文的 0.683 与 0.733 属于别的格子', () => {
  const t = varianceTable();
  const row = t.rows.find((r) => r.rho === 0.6);
  assert.strictEqual(row.computed[1].toFixed(3), '0.680');
  assert.strictEqual(row.computed[0].toFixed(3), '0.733');
  assert.strictEqual(row.computed[2].toFixed(3), '0.640');
});

test('五个模型：方差 0.0100 → 0.0068，标准差 0.100 → 0.082，降 18%', () => {
  const c = fiveModelCase();
  assert.strictEqual(c.sigma, 0.1);
  assert.strictEqual(c.rho, 0.6);
  assert.strictEqual(c.M, 5);
  assert.strictEqual(c.varBefore.toFixed(4), '0.0100');
  assert.strictEqual(c.varAfter.toFixed(4), '0.0068');
  assert.strictEqual(c.sdAfter.toFixed(3), '0.082');
  assert.strictEqual((c.shrink * 100).toFixed(0), '18');
  assert.ok(docText().includes('0.0068') && docText().includes('0.082'));
});

test('降幅远不到五分之一：与「错误完全独立」的理想情况差一大截', () => {
  const c = fiveModelCase();
  assert.ok(c.sdAfter > c.independentSd * 1.5, `实际 ${c.sdAfter} vs 理想 ${c.independentSd}`);
  assert.strictEqual(c.independentSd.toFixed(3), '0.045');
});

test('ρ=0.9 时同样的五个模型几乎不降：方差比 0.92', () => {
  assert.strictEqual(varRatio(0.9, 5).toFixed(2), '0.92');
  assert.ok(varRatio(0.9, 5) > 0.9);
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
