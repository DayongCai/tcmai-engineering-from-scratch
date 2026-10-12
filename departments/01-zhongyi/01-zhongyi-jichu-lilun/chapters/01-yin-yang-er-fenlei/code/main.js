#!/usr/bin/env node
/**
 * 中医基础理论 · 第 1 章 阴阳学说 → 二分类：从零实现逻辑回归
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/docs/zh.md
 * 出处: 《素问·阴阳应象大论》；八纲总纲见《医学心悟》(清·程钟龄)
 * 依赖: 仅 Node.js 标准库
 *
 * 说明: 数据是 8 例八纲典型证候的教学样例，用于演示「阴阳 → 二分类」的翻译过程。
 *       它不是临床数据集，输出不构成任何诊疗建议。
 */

'use strict';

// ── 特征与样本 ──────────────────────────────────────────────
// 特征: [畏寒程度, 口渴程度, 脉数程度]，均为 0..1 的连续量
// 标签: 0 = 阴证, 1 = 阳证
const FEATURES = ['畏寒', '口渴', '脉数'];

const SAMPLES = [
  { name: '畏寒肢冷、口不渴、脉迟',     x: [0.90, 0.10, 0.08], y: 0 },
  { name: '面色苍白、喜热饮、脉沉迟',   x: [0.85, 0.15, 0.10], y: 0 },
  { name: '精神萎靡、小便清长、舌淡',   x: [0.80, 0.20, 0.15], y: 0 },
  { name: '腹冷喜按、便溏、脉弱',       x: [0.75, 0.25, 0.18], y: 0 },
  { name: '发热恶热、口渴喜冷饮、脉数', x: [0.10, 0.90, 0.88], y: 1 },
  { name: '面红目赤、烦躁、脉洪大',     x: [0.08, 0.85, 0.92], y: 1 },
  { name: '小便短赤、便秘、舌红',       x: [0.15, 0.80, 0.80], y: 1 },
  { name: '壮热、汗出、脉滑数',         x: [0.05, 0.95, 0.95], y: 1 },
];

// ── 手写基础件 ──────────────────────────────────────────────
/** sigmoid，数值稳定写法：z 很负时避免 exp(-z) 溢出 */
function sigmoid(z) {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) s += a[i] * b[i];
  return s;
}

function predict(w, b, x) {
  return sigmoid(dot(w, x) + b);
}

/** 交叉熵损失 + 梯度（全批量） */
function lossAndGrad(w, b, X, y) {
  const gw = new Array(w.length).fill(0);
  let gb = 0;
  let loss = 0;
  const eps = 1e-12;
  for (let i = 0; i < X.length; i += 1) {
    const p = predict(w, b, X[i]);
    loss += -(y[i] * Math.log(p + eps) + (1 - y[i]) * Math.log(1 - p + eps));
    const d = p - y[i]; // 交叉熵 + sigmoid ⇒ 梯度就是 (预测 − 真实)
    for (let j = 0; j < w.length; j += 1) gw[j] += d * X[i][j];
    gb += d;
  }
  const n = X.length;
  return { loss: loss / n, gw: gw.map((g) => g / n), gb: gb / n };
}

/** 全批量梯度下降 */
function train(X, y, { lr = 0.5, steps = 4000, dim = 3 } = {}) {
  let w = new Array(dim).fill(0);
  let b = 0;
  const history = [];
  for (let step = 0; step < steps; step += 1) {
    const { loss, gw, gb } = lossAndGrad(w, b, X, y);
    if (step % 500 === 0) history.push(loss);
    for (let j = 0; j < dim; j += 1) w[j] -= lr * gw[j];
    b -= lr * gb;
  }
  return { w, b, history };
}

function accuracy(w, b, X, y) {
  let ok = 0;
  for (let i = 0; i < X.length; i += 1) {
    if ((predict(w, b, X[i]) >= 0.5 ? 1 : 0) === y[i]) ok += 1;
  }
  return ok / X.length;
}

// ── 复现用随机源（只为对照小批量训练，不用来掩盖结果） ────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 小批量梯度下降 —— 与全批量对照，验证解在同一量级 */
function trainMiniBatch(X, y, { lr = 0.5, steps = 2000, batch = 4, seed = 20261012, dim = 3 } = {}) {
  const rnd = mulberry32(seed);
  let w = new Array(dim).fill(0);
  let b = 0;
  for (let step = 0; step < steps; step += 1) {
    const idx = [];
    while (idx.length < Math.min(batch, X.length)) {
      const k = Math.floor(rnd() * X.length);
      if (!idx.includes(k)) idx.push(k);
    }
    const bx = idx.map((i) => X[i]);
    const by = idx.map((i) => y[i]);
    const { gw, gb } = lossAndGrad(w, b, bx, by);
    for (let j = 0; j < dim; j += 1) w[j] -= lr * gw[j];
    b -= lr * gb;
  }
  return { w, b };
}

// ── 主流程 ──────────────────────────────────────────────────
function main() {
  const X = SAMPLES.map((s) => s.x);
  const y = SAMPLES.map((s) => s.y);

  console.log('═══ 阴阳 → 二分类：从零实现 (中医基础理论 第1章) ═══');
  console.log(`样本: ${SAMPLES.length} 例八纲典型证候 | 特征: ${FEATURES.join(' / ')}`);

  const { w, b, history } = train(X, y, { lr: 0.5, steps: 4000 });
  const acc = accuracy(w, b, X, y);

  console.log(`训练 4000 步后:`);
  console.log(`  w = [${w.map((v) => v.toFixed(2).padStart(6)).join(', ')}]`);
  console.log(`  b = ${b.toFixed(2)}`);
  console.log(`  损失轨迹 (每500步): ${history.map((v) => v.toFixed(3)).join(' → ')}`);
  console.log(`  训练集准确率: ${Math.round(acc * SAMPLES.length)}/${SAMPLES.length} = ${(acc * 100).toFixed(0)}%`);
  console.log('解读:');
  FEATURES.forEach((f, j) => {
    const dir = w[j] < 0 ? '偏阴' : '偏阳';
    console.log(`  ${FEATURES[j]}项 w=${w[j].toFixed(2)} → 该项越强越${dir}`);
  });

  // 与小批量版本对照：符号必须一致
  const mini = trainMiniBatch(X, y, { lr: 0.5, steps: 2000, batch: 4 });
  const signAgree = mini.w.every((v, j) => Math.sign(v) === Math.sign(w[j]));
  console.log('对照: 小批量(seed=20261012, batch=4, 2000步)');
  console.log(`  w = [${mini.w.map((v) => v.toFixed(2).padStart(6)).join(', ')}]`);
  console.log(`  符号与全批量一致: ${signAgree ? '是 ✅（解法稳定）' : '否 ❌（检查学习率/特征尺度）'}`);

  console.log('边界声明: 本例为教学样例，非临床数据集；输出不构成诊疗建议。');

  return { w, b, acc, mini, signAgree };
}

if (require.main === module) {
  main();
}

module.exports = {
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
  main,
};
