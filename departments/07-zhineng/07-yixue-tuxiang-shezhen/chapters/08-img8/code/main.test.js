'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  docText,
  quizData,
  hanzi,
  grams,
  expectedAgreement,
  kappa,
  pabak,
  kappaFromDoc,
  degenerateCase,
  diceGap,
  arbitrationRate,
  quizAudit,
} = require('./main.js');

test('kappa 公式：Po=1 时得 1，Po=Pe 时得 0，Pe 趋近 1 时无定义', () => {
  assert.strictEqual(kappa(1, 0.3), 1);
  assert.strictEqual(kappa(0.4, 0.4), 0);
  assert.strictEqual(kappa(0.9, 1), null);
});

test('两位标注员的边际分布从正文读出，各 5 类且各自和为 1', () => {
  const k = kappaFromDoc();
  assert.strictEqual(k.a.length, 5);
  assert.strictEqual(k.b.length, 5);
  assert.ok(Math.abs(k.a.reduce((s, v) => s + v, 0) - 1) < 1e-9);
  assert.ok(Math.abs(k.b.reduce((s, v) => s + v, 0) - 1) < 1e-9);
  assert.strictEqual(k.po, 0.78);
});

test('Pe 现算 0.272，kappa ≈ 0.70，与正文一致', () => {
  const k = kappaFromDoc();
  assert.strictEqual(k.pe.toFixed(3), '0.272');
  assert.strictEqual(k.kappa.toFixed(2), '0.70');
  assert.ok(docText().includes('0.272'));
  assert.ok(docText().includes('0.728'), '正文把 kappa 的分母写作 0.728');
});

test('PABAK = 2Po − 1 = 0.56，是偏倚情形下该并排看的另一个口径', () => {
  const k = kappaFromDoc();
  assert.strictEqual(pabak(0.78), 0.56);
  assert.strictEqual(k.pabak.toFixed(2), '0.56');
  assert.ok(docText().includes('PABAK'));
});

test('悖论一：95/5 全判多数类，Po 与 Pe 都是 0.905，kappa 为 0', () => {
  const d = degenerateCase();
  assert.strictEqual(d.po.toFixed(3), '0.905');
  assert.strictEqual(d.pe.toFixed(3), '0.905');
  assert.strictEqual(d.kappa, 0);
  assert.ok(docText().includes('0.905'));
});

test('期望一致率由乘积之和构成：完全独立时为 Σp1k·p2k', () => {
  assert.strictEqual(expectedAgreement([0.4, 0.6], [0.4, 0.6]).toFixed(2), '0.52');
  assert.strictEqual(expectedAgreement([1, 0], [0, 1]), 0);
});

test('Dice：人际 0.94、模型 0.91，差 0.03，人际自身分歧 6%', () => {
  const g = diceGap();
  assert.strictEqual(g.human, 0.94);
  assert.strictEqual(g.model, 0.91);
  assert.strictEqual(g.gap.toFixed(2), '0.03');
  assert.strictEqual((g.humanDisagreement * 100).toFixed(0), '6');
});

test('仲裁比例：400 张里 88 张 = 22%', () => {
  const r = arbitrationRate();
  assert.strictEqual(r.total, 400);
  assert.strictEqual(r.arbitrated, 88);
  assert.strictEqual((r.rate * 100).toFixed(0), '22');
  assert.strictEqual(r.claimedPct, 22);
  assert.ok(docText().includes('25%'), '正文给出「长期高于 25%」的规范缺口判据');
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
