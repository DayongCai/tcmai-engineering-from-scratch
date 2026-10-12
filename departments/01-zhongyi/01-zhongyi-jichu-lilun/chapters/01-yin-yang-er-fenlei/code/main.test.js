#!/usr/bin/env node
/**
 * 第 1 章 阴阳 → 二分类 —— 确定性单元测试
 * 运行: node --test code/
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  FEATURES,
  SAMPLES,
  sigmoid,
  dot,
  predict,
  lossAndGrad,
  train,
  trainMiniBatch,
  accuracy,
  mulberry32,
} = require('./main');

const X = SAMPLES.map((s) => s.x);
const y = SAMPLES.map((s) => s.y);

test('sigmoid 在 0 处等于 0.5，值域落在 (0,1]', () => {
  assert.strictEqual(sigmoid(0), 0.5);
  // 中等量级的 z 必须严格落在开区间内
  for (const z of [-3, -0.5, 0, 1.5, 4]) {
    const p = sigmoid(z);
    assert.ok(p > 0 && p < 1, `sigmoid(${z}) = ${p} 越界`);
  }
  // 极端量级在 float64 下会被舍入到端点，这是精度边界而非 bug
  for (const z of [-50, -3, -0.5, 0, 0.5, 3, 50]) {
    const p = sigmoid(z);
    assert.ok(p >= 0 && p <= 1, `sigmoid(${z}) = ${p} 越界`);
  }
  assert.strictEqual(sigmoid(50), 1);   // e^-50 ≈ 1.9e-22，小于 1 的相对精度，舍入为 1
  assert.ok(sigmoid(-50) > 0 && sigmoid(-50) < 1e-20); // 负侧仍保留有效数字，不塌成 0
});

test('sigmoid 对极大负值不溢出 NaN（数值稳定性）', () => {
  assert.ok(Number.isFinite(sigmoid(-800)));
  assert.strictEqual(sigmoid(-800), 0);
  assert.strictEqual(sigmoid(800), 1);
});

test('sigmoid 关于原点对称: σ(z) + σ(-z) = 1', () => {
  for (const z of [0.1, 1.7, 4.2, 12]) {
    assert.ok(Math.abs(sigmoid(z) + sigmoid(-z) - 1) < 1e-12);
  }
});

test('数据集形状与教材表一致：8 例、3 特征、阴阳各 4 例', () => {
  assert.strictEqual(FEATURES.length, 3);
  assert.strictEqual(SAMPLES.length, 8);
  assert.strictEqual(y.filter((v) => v === 0).length, 4);
  assert.strictEqual(y.filter((v) => v === 1).length, 4);
  for (const s of SAMPLES) {
    assert.strictEqual(s.x.length, 3);
    assert.ok(s.x.every((v) => v >= 0 && v <= 1), `${s.name} 的特征未归一化`);
  }
});

test('初始权重为 0 时，交叉熵损失等于 ln2（先验 0.5 的基线）', () => {
  const { loss } = lossAndGrad([0, 0, 0], 0, X, y);
  // 容差 1e-9：lossAndGrad 在 log 内加 eps=1e-12 防止 log(0)，会给结果带来该量级的偏差
  assert.ok(Math.abs(loss - Math.LN2) < 1e-9, `初始损失 ${loss} 应约等于 ${Math.LN2}`);
});

test('训练后权重符号稳定：畏寒为负，口渴与脉数为正', () => {
  const { w } = train(X, y, { lr: 0.5, steps: 4000 });
  assert.ok(w[0] < 0, `畏寒项应为负，实得 ${w[0]}`);
  assert.ok(w[1] > 0, `口渴项应为正，实得 ${w[1]}`);
  assert.ok(w[2] > 0, `脉数项应为正，实得 ${w[2]}`);
});

test('训练后损失单调下降到远低于 ln2 的水平', () => {
  const { loss: first } = lossAndGrad([0, 0, 0], 0, X, y);
  const { w, b } = train(X, y, { lr: 0.5, steps: 4000 });
  const { loss: last } = lossAndGrad(w, b, X, y);
  assert.ok(last < first / 100, `损失未充分下降: ${first} → ${last}`);
});

test('训练后训练集准确率为 100%（8/8）', () => {
  const { w, b } = train(X, y, { lr: 0.5, steps: 4000 });
  assert.strictEqual(accuracy(w, b, X, y), 1);
});

test('小批量与全批量的解符号一致（解法稳定性）', () => {
  const full = train(X, y, { lr: 0.5, steps: 4000 });
  const mini = trainMiniBatch(X, y, { lr: 0.5, steps: 2000, batch: 4 });
  mini.w.forEach((v, j) => {
    assert.strictEqual(
      Math.sign(v), Math.sign(full.w[j]),
      `第 ${j} 个特征符号不一致: 全批量 ${full.w[j]} vs 小批量 ${v}`
    );
  });
});

test('小批量训练可复现：同一 seed 两次结果完全一致', () => {
  const a = trainMiniBatch(X, y, { seed: 42, steps: 200 });
  const b = trainMiniBatch(X, y, { seed: 42, steps: 200 });
  assert.deepStrictEqual(a.w, b.w);
  assert.strictEqual(a.b, b.b);
});

test('mulberry32 是确定性伪随机源', () => {
  const r1 = mulberry32(7);
  const r2 = mulberry32(7);
  for (let i = 0; i < 5; i += 1) assert.strictEqual(r1(), r2());
});

test('predict 输出的即 sigmoid(wᵀx + b)，两者必须恒等', () => {
  const w = [-7.6, 5.19, 5.85];
  const b = -2.1;
  for (const s of SAMPLES) {
    assert.strictEqual(predict(w, b, s.x), sigmoid(dot(w, s.x) + b));
  }
});

test('dot 与手算一致，且对零向量返回 0', () => {
  assert.strictEqual(dot([1, 2, 3], [4, 5, 6]), 32);
  assert.strictEqual(dot([0, 0, 0], [9, 9, 9]), 0);
});
