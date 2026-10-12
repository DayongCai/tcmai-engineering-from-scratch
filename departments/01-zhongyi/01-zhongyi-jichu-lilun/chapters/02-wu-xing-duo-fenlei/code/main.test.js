#!/usr/bin/env node
/**
 * 第 2 章 五行 → 多分类 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  CLASSES, FEATURES, CLASS_TABLE, SHENG, KE, K, DIM,
  softmax, forward, cosine, lossAndGrad, train, accuracy, relationReport, makeDataset,
} = require('./main');

const { X, y } = makeDataset();

test('softmax 输出和为 1，且非负', () => {
  for (const z of [[0, 0, 0, 0, 0], [1, 2, 3, 4, 5], [-3, 0, 7, -1, 2]]) {
    const p = softmax(z);
    assert.strictEqual(p.length, K);
    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    assert.ok(p.every((v) => v >= 0));
  }
});

test('softmax 数值稳定：大输入不溢出为 NaN', () => {
  const p = softmax([1000, 1000, 1000, 1000, 1000]);
  assert.ok(p.every(Number.isFinite), 'softmax 溢出');
  assert.ok(p.every((v) => Math.abs(v - 0.2) < 1e-12), '五项相等时应各为 0.2');
  assert.ok(softmax([-1000, 0, 1000, 0, 0]).every(Number.isFinite));
});

test('softmax 平移不变性：加同一个常数不改变结果', () => {
  const a = softmax([1, 2, 3, 4, 5]);
  const b = softmax([101, 102, 103, 104, 105]);
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-12));
});

test('余弦相似度：自相似为 1，反向为 −1，正交为 0', () => {
  assert.ok(Math.abs(cosine([1, 2, 3, 4], [1, 2, 3, 4]) - 1) < 1e-12);
  assert.ok(Math.abs(cosine([1, 0], [-1, 0]) + 1) < 1e-12);
  assert.ok(Math.abs(cosine([1, 0], [0, 1])) < 1e-12);
  assert.strictEqual(cosine([0, 0], [1, 1]), 0); // 零向量不做除零
});

test('生克关系表正确：各 5 条，且相生对与相克对不重叠', () => {
  assert.strictEqual(SHENG.length, 5);
  assert.strictEqual(KE.length, 5);
  const key = (p) => `${p[0]}-${p[1]}`;
  const shengSet = new Set(SHENG.map(key));
  for (const p of KE) assert.ok(!shengSet.has(key(p)), `相生相克重复: ${key(p)}`);
  // 相生是相邻环，相克是隔一
  SHENG.forEach(([i, j]) => assert.strictEqual(j, (i + 1) % K));
  KE.forEach(([i, j]) => assert.strictEqual(j, (i + 2) % K));
});

test('数据集形状：5 类 × 4 例 = 20 例，每类恰好 4 例', () => {
  assert.strictEqual(X.length, 20);
  assert.strictEqual(y.length, 20);
  for (let c = 0; c < K; c += 1) {
    assert.strictEqual(y.filter((v) => v === c).length, 4, `类 ${CLASSES[c]} 样本数不是 4`);
  }
  assert.ok(X.every((row) => row.length === DIM));
  assert.strictEqual(FEATURES.length, DIM);
  assert.strictEqual(CLASS_TABLE.length, K);
});

test('通行配属表四个维度的次序完全一致（本课的核心发现，需被测试固化）', () => {
  const col = (j) => CLASS_TABLE.map((r) => r[j]).join();
  assert.strictEqual(col(1), col(0), '色与味次序不一致');
  assert.strictEqual(col(2), col(0), '色与志次序不一致');
  assert.strictEqual(col(3), col(0), '色与方位次序不一致');
  // 结论：特征矩阵共线，这是 λ=0 时关系一致性已被免费满足的根因
});

test('λ=0 时损失与梯度不受正则影响（regLoss 只是诊断量）', () => {
  const W = Array.from({ length: K }, () => new Array(DIM).fill(0));
  const b = new Array(K).fill(0);
  const lambdaZero = lossAndGrad(W, b, X, y, { lambda: 0 });
  const marginZero = lossAndGrad(W, b, X, y, { lambda: 0, mSheng: 0, mKe: 0 });

  // λ=0 ⇒ 正则项的梯度贡献为 0，损失等于纯交叉熵
  assert.strictEqual(lambdaZero.loss, lambdaZero.dataLoss);
  assert.deepStrictEqual(lambdaZero.gW, marginZero.gW);
  assert.deepStrictEqual(lambdaZero.gb, marginZero.gb);
  assert.strictEqual(marginZero.regLoss, 0);

  // 注意：λ=0 时 regLoss 仍会被计算出来（零向量之间的余弦为 0，违反相生下界），
  // 但它不进入损失也不进入梯度 —— 这正是"诊断量 ≠ 损失项"的体现
  assert.strictEqual(lambdaZero.regLoss, 5 * 0.3);

  assert.ok(Math.abs(lambdaZero.dataLoss - Math.log(K)) < 1e-9, '均匀先验下交叉熵应约等于 ln5');
});

test('λ=0 训练后准确率为 100%（特征共线使问题线性可分）', () => {
  const { W, b } = train(X, y, { lambda: 0 });
  assert.strictEqual(accuracy(W, b, X, y), 1);
});

test('λ=0 时关系一致性已被满足：相生余弦均值 > 相克余弦均值', () => {
  const { W } = train(X, y, { lambda: 0 });
  const r = relationReport(W);
  assert.ok(r.shengAvg > r.keAvg, `相生 ${r.shengAvg} 未高于相克 ${r.keAvg}`);
  assert.ok(r.gap > 0.2, `关系差仅 ${r.gap}，与教材记录的 0.507 差距过大，检查数据构造`);
  assert.strictEqual(r.consistent, true);
});

test('加大 λ 会牺牲准确率（约束不是免费的）', () => {
  const plain = train(X, y, { lambda: 0 });
  const strong = train(X, y, { lambda: 5 });
  const aPlain = accuracy(plain.W, plain.b, X, y);
  const aStrong = accuracy(strong.W, strong.b, X, y);
  assert.strictEqual(aPlain, 1);
  assert.ok(aStrong < aPlain, `λ=5 准确率 ${aStrong} 未低于 λ=0 的 ${aPlain}`);
});

test('训练确定性：同一 seed 两次结果逐位一致', () => {
  const a = train(X, y, { lambda: 1, steps: 400 });
  const b = train(X, y, { lambda: 1, steps: 400 });
  assert.deepStrictEqual(a.W, b.W);
  assert.deepStrictEqual(a.b, b.b);
});

test('forward 输出的长度与概率性质正确', () => {
  const W = Array.from({ length: K }, () => new Array(DIM).fill(0.1));
  const b = new Array(K).fill(0);
  const p = forward(W, b, X[0]);
  assert.strictEqual(p.length, K);
  assert.ok(Math.abs(p.reduce((a, v) => a + v, 0) - 1) < 1e-12);
});
