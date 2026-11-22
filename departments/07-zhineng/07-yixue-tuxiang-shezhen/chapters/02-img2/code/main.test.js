'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  icc,
  iccFromDoc,
  deltaE,
  cardFit,
  quizAudit,
} = require('./main.js');

test('ICC 定义式：σ²受试间 /（σ²受试间 + σ²误差）', () => {
  assert.ok(Math.abs(icc(1.0, 0.25) - 0.8) < 1e-9);
  assert.ok(Math.abs(icc(1.0, 1.0) - 0.5) < 1e-9);
});

test('从正文读出方差分量：1.0 与 0.25，误差对照 0.67', () => {
  const i = iccFromDoc();
  assert.strictEqual(i.between, 1.0);
  assert.strictEqual(i.error, 0.25);
  assert.strictEqual(i.error2, 0.67);
});

test('ICC 现算 0.80，误差项升到 0.67 后掉到 0.60，与正文一致', () => {
  const i = iccFromDoc();
  assert.strictEqual(i.first.toFixed(2), '0.80');
  assert.strictEqual(i.second.toFixed(2), '0.60');
  assert.ok(docText().includes('0.80'));
  assert.ok(docText().includes('0.60'));
  assert.ok(i.second < i.first, '误差项变大，ICC 必须下降');
});

test('ICC 对误差项单调：误差越大，一致性越低', () => {
  const i = iccFromDoc();
  const mid = icc(i.between, i.error2 / 2);
  assert.ok(i.first > mid && mid > i.second, `应为 ${i.first} > ${mid} > ${i.second}`);
});

test('色差：校正前 6.4 可辨、校正后 1.8 落在阈值 2 以下', () => {
  const d = deltaE();
  assert.strictEqual(d.before, 6.4);
  assert.strictEqual(d.after, 1.8);
  assert.strictEqual(d.threshold, 2);
  assert.strictEqual(d.beforeVisible, true);
  assert.strictEqual(d.afterVisible, false);
  assert.ok(d.after < d.threshold && d.threshold < d.before);
});

test('色卡最小二乘是超定的：24 个色块对 12 个未知量', () => {
  const c = cardFit();
  assert.strictEqual(c.patches, 24);
  assert.strictEqual(c.unknowns, 12);
  assert.strictEqual(c.overdetermined, true);
  assert.strictEqual(c.ratio, 2);
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
