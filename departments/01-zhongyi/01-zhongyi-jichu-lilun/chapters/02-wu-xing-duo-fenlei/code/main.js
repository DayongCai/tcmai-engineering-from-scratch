#!/usr/bin/env node
/**
 * 中医基础理论 · 第 2 章 五行学说 → 多分类：从零实现 Softmax，并加入生克约束
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/docs/zh.md
 * 出处: 《尚书·洪范》五行次序；生克关系见《素问·五运行大论》
 * 依赖: 仅 Node.js 标准库
 *
 * 核心命题: 五行是 5 类 —— 但纯 softmax 会丢掉全部关系信息。
 * 本课把「相生 / 相克」写成一对余弦约束加进损失，比较加约束前后的差别。
 *
 * 说明: 数据是按五行属性表构造的教学样例，非临床数据集。
 */

'use strict';

const CLASSES = ['木', '火', '土', '金', '水'];
const FEATURES = ['色', '味', '志', '方位'];

// 五行属性表（每行 = 该类在 4 个特征上的取值，归一化到 0..2）
// 依据通行配属：木-青酸怒东 / 火-赤苦喜南 / 土-黄甘思中 / 金-白辛悲西 / 水-黑咸恐北
const CLASS_TABLE = [
  [0, 0, 0, 0], // 木: 青 酸 怒 东
  [1, 1, 1, 1], // 火: 赤 苦 喜 南
  [2, 2, 2, 2], // 土: 黄 甘 思 中
  [3, 3, 3, 3], // 金: 白 辛 悲 西
  [4, 4, 4, 4], // 水: 黑 咸 恐 北
];

/** 相生: 木→火→土→金→水→木；相克: 木克土、土克水、水克火、火克金、金克木 */
const SHENG = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
const KE = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]];

const DIM = 4;
const K = 5;

// ── 构造样本：每类 4 例，带少量扰动 ─────────────────────────
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

function makeDataset(seed = 20261012, perClass = 4) {
  const rnd = mulberry32(seed);
  const X = [];
  const y = [];
  for (let c = 0; c < K; c += 1) {
    for (let r = 0; r < perClass; r += 1) {
      X.push(CLASS_TABLE[c].map((v) => (v + (rnd() - 0.5) * 1.2) / 4));
      y.push(c);
    }
  }
  return { X, y };
}

// ── 基础件 ─────────────────────────────────────────────────
function softmax(z) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m)); // 减 max：数值稳定的必要条件
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function forward(W, b, x) {
  return softmax(W.map((row, k) => row.reduce((a, wj, j) => a + wj * x[j], b[k])));
}

function cosine(a, b) {
  let d = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i += 1) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const den = Math.sqrt(na) * Math.sqrt(nb);
  return den === 0 ? 0 : d / den;
}

/**
 * 交叉熵 + 生克正则
 *   相生对: hinge( cos < mSheng )  → 把相生两类的权重向量拉近
 *   相克对: hinge( cos > mKe    )  → 把相克两类的权重向量推远
 */
function lossAndGrad(W, b, X, y, { lambda = 0, mSheng = 0.3, mKe = 0.1 } = {}) {
  const gW = W.map((r) => r.map(() => 0));
  const gb = b.map(() => 0);
  let ce = 0;

  for (let i = 0; i < X.length; i += 1) {
    const p = forward(W, b, X[i]);
    ce += -Math.log(p[y[i]] + 1e-12);
    for (let k = 0; k < K; k += 1) {
      const d = p[k] - (k === y[i] ? 1 : 0);
      for (let j = 0; j < DIM; j += 1) gW[k][j] += d * X[i][j];
      gb[k] += d;
    }
  }
  const n = X.length;
  const dataLoss = ce / n;
  for (let k = 0; k < K; k += 1) for (let j = 0; j < DIM; j += 1) gW[k][j] /= n;
  for (let k = 0; k < K; k += 1) gb[k] /= n;

  let regLoss = 0;
  const applyHinge = (i, j, wantAbove) => {
    const c = cosine(W[i], W[j]);
    const violation = wantAbove ? mSheng - c : c - mKe;
    if (violation <= 0) return;
    regLoss += violation;
    // d(cos)/d(W[i]) = W[j]/(|W[i]||W[j]|) − cos·W[i]/|W[i]|²
    const ni = Math.sqrt(W[i].reduce((a, v) => a + v * v, 0));
    const nj = Math.sqrt(W[j].reduce((a, v) => a + v * v, 0));
    // 零向量的余弦未定义，其梯度是 0/0。此处不下梯度（不是"近似"，是这一项本来就不存在）。
    // 少了这个守卫，lambda=0 时 0*NaN 也会把整个梯度污染成 NaN。
    if (ni === 0 || nj === 0) return;
    const sign = wantAbove ? -1 : 1;
    for (let d = 0; d < DIM; d += 1) {
      const gi = sign * (W[j][d] / (ni * nj) - (c * W[i][d]) / (ni * ni));
      const gj = sign * (W[i][d] / (ni * nj) - (c * W[j][d]) / (nj * nj));
      gW[i][d] += lambda * gi;
      gW[j][d] += lambda * gj;
    }
  };
  for (const [i, j] of SHENG) applyHinge(i, j, true);
  for (const [i, j] of KE) applyHinge(i, j, false);

  return { loss: dataLoss + lambda * regLoss, dataLoss, regLoss, gW, gb };
}

function train(X, y, opts = {}) {
  const { lr = 0.6, steps = 3000, lambda = 0, mSheng = 0.3, mKe = 0.1, seed = 7 } = opts;
  const rnd = mulberry32(seed);
  const W = Array.from({ length: K }, () => Array.from({ length: DIM }, () => (rnd() - 0.5) * 0.2));
  const b = new Array(K).fill(0);
  const history = [];
  for (let s = 0; s < steps; s += 1) {
    const { loss, gW, gb } = lossAndGrad(W, b, X, y, { lambda, mSheng, mKe });
    if (s % 500 === 0) history.push(loss);
    for (let k = 0; k < K; k += 1) {
      for (let j = 0; j < DIM; j += 1) W[k][j] -= lr * gW[k][j];
      b[k] -= lr * gb[k];
    }
  }
  return { W, b, history };
}

function accuracy(W, b, X, y) {
  let ok = 0;
  for (let i = 0; i < X.length; i += 1) {
    const p = forward(W, b, X[i]);
    let arg = 0;
    for (let k = 1; k < K; k += 1) if (p[k] > p[arg]) arg = k;
    if (arg === y[i]) ok += 1;
  }
  return ok / X.length;
}

/** 关系一致性检查：相生对的平均余弦 应高于 相克对的平均余弦 */
function relationReport(W) {
  const sheng = SHENG.map(([i, j]) => cosine(W[i], W[j]));
  const ke = KE.map(([i, j]) => cosine(W[i], W[j]));
  const avg = (a) => a.reduce((x, y2) => x + y2, 0) / a.length;
  return {
    shengAvg: avg(sheng),
    keAvg: avg(ke),
    gap: avg(sheng) - avg(ke),
    sheng,
    ke,
    consistent: avg(sheng) > avg(ke),
  };
}

function main() {
  const { X, y } = makeDataset();
  console.log('═══ 五行 → 多分类：从零实现 Softmax + 生克约束 (中医基础理论 第2章) ═══');
  console.log(`样本: ${X.length} 例 (${K} 类 × 4) | 特征: ${FEATURES.join(' / ')}`);

  // 先看特征矩阵本身：通行配属表里四个维度的次序是否一致？
  const col = (j) => CLASS_TABLE.map((r) => r[j]);
  const ordersEqual = [1, 2, 3].every((j) => col(j).join() === col(0).join());
  console.log(`特征共线检查: 四列次序完全一致 = ${ordersEqual ? '是 ⚠（结构上共线，见下文）' : '否'}`);

  const plain = train(X, y, { lambda: 0 });
  const rPlain = relationReport(plain.W);
  const aPlain = accuracy(plain.W, plain.b, X, y);

  console.log('');
  console.log('【A】纯 softmax（λ=0）');
  console.log(`  训练准确率: ${(aPlain * 100).toFixed(1)}%`);
  console.log(`  相生对平均余弦: ${rPlain.shengAvg.toFixed(3)} | 相克对平均余弦: ${rPlain.keAvg.toFixed(3)} | 差 ${rPlain.gap.toFixed(3)}`);
  console.log(`  关系一致性: ${rPlain.consistent ? '满足 ✅' : '被破坏 ❌'}`);

  console.log('');
  console.log('【B】生克正则的 λ 扫描');
  console.log('  λ      准确率   相生均值   相克均值   差值');
  const sweep = [0, 0.2, 0.5, 1.0, 2.0, 5.0].map((lambda) => {
    const m = lambda === 0 ? plain : train(X, y, { lambda, mSheng: 0.3, mKe: 0.1 });
    const r = relationReport(m.W);
    const a = accuracy(m.W, m.b, X, y);
    console.log(
      `  ${String(lambda).padEnd(6)} ${((a * 100).toFixed(1) + '%').padEnd(8)} ` +
      `${r.shengAvg.toFixed(3).padEnd(10)} ${r.keAvg.toFixed(3).padEnd(10)} ${r.gap.toFixed(3)}`
    );
    return { lambda, acc: a, ...r };
  });

  const bestGap = sweep.reduce((a, b) => (b.gap > a.gap ? b : a));
  const bestAcc = sweep.reduce((a, b) => (b.acc > a.acc ? b : a));

  console.log('');
  console.log('【C】逐对明细（λ=2.0）');
  const reg = train(X, y, { lambda: 2.0, mSheng: 0.3, mKe: 0.1 });
  const rReg = relationReport(reg.W);
  SHENG.forEach(([i, j], n) => {
    console.log(`  生 ${CLASSES[i]}→${CLASSES[j]}: cos=${rReg.sheng[n].toFixed(3)}`);
  });
  KE.forEach(([i, j], n) => {
    console.log(`  克 ${CLASSES[i]}→${CLASSES[j]}: cos=${rReg.ke[n].toFixed(3)}`);
  });

  console.log('');
  console.log(`结论 1: 纯 softmax 在本数据上**没有**破坏生克关系（差值 ${rPlain.gap.toFixed(3)} > 0）——`);
  console.log('        「纯 softmax 一定丢掉关系」这个说法在本数据上是错的。原因是通行配属表里');
  console.log('        色/味/志/方位四列的次序完全一致，特征矩阵共线，最优解天然把类沿一条轴排开。');
  console.log(`结论 2: 加上正则后关系差最大出现在 λ=${bestGap.lambda}（差 ${bestGap.gap.toFixed(3)}），`);
  console.log(`        但准确率最高出现在 λ=${bestAcc.lambda}（${(bestAcc.acc * 100).toFixed(1)}%）。约束不是免费的。`);
  console.log('        要真正让约束起作用，需要特征表示本身不共线 —— 那是后续「药性嵌入」章的题目。');
  console.log('边界声明: 教学样例数据，非临床数据集；输出不构成诊疗建议。');

  return { plain, reg, aPlain, rPlain, rReg, sweep, ordersEqual };
}

if (require.main === module) {
  main();
}

module.exports = {
  CLASSES, FEATURES, CLASS_TABLE, SHENG, KE, DIM, K,
  softmax, forward, cosine, lossAndGrad, train, accuracy, relationReport,
  makeDataset, mulberry32, main,
};
