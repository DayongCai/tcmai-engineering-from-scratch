#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 2 章 深层网络不是更聪明，是把误差分配得更细
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/02-llm2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文里给了三组可复算的量，脚本全部从 docs/zh.md 读出再算：
 *   ① 单神经元一次前向／反向（w=0.5, x=2, y=1, η=0.1）→ a、L、δ、更新后的 w
 *   ② 参数量与样本量的比值、以及「不超过样本量 1/10」的经验线上限
 *   ③ 六百样本、准确率 0.85 的二项分布 95% 置信区间
 * 正文没写的量不补；不报任何模型的实测分数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function sigmoid(z) {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/** 从「$w=0.5$、$b=0$、输入 $x=2$、真值 $y=1$、学习率 $\eta=0.1$」读算例设定 */
function parseNeuron(text) {
  const pick = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error(`正文里没找到单神经元算例的${name}`);
    return Number(m[1]);
  };
  return {
    w: pick(/\$w=([\d.]+)\$/, '初始权重'),
    b: pick(/\$b=(-?[\d.]+)\$/, '偏置'),
    x: pick(/输入 \$x=(-?[\d.]+)\$/, '输入'),
    y: pick(/真值 \$y=(-?[\d.]+)\$/, '真值'),
    eta: pick(/学习率 \$\\eta=([\d.]+)\$/, '学习率'),
  };
}

/** 单神经元一次前向 + 平方损失 + 反向，返回三个因子与更新后的权重 */
function step({ w, b, x, y, eta }) {
  const z = w * x + b;
  const a = sigmoid(z);
  const loss = 0.5 * (a - y) * (a - y);
  const dOut = a - y; // 这一层输出错得多离谱
  const dAct = a * (1 - a); // 激活在这里还灵不灵
  const delta = dOut * dAct; // δ = (a − y) · a(1 − a)
  const gradW = delta * x; // 再乘「这个输入出了多少力」
  return { z, a, loss, dOut, dAct, delta, gradW, w2: w - eta * gradW };
}

/** 从正文四条算例 bullet 里读出它自己给的近似值（≈ 后面的数） */
function parseWorkedExample(text) {
  const grab = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error(`正文算例缺少「${name}」那一行`);
    return Number(m[1]);
  };
  return {
    a: grab(/- 前向：[^\n]*\\approx\s*([\d.]+)/, '前向'),
    loss: grab(/- 损失[^\n]*\\approx\s*([\d.]+)/, '损失'),
    delta: grab(/- 梯度：[^\n]*\\approx\s*(-?[\d.]+)/, '梯度'),
    w: grab(/- 更新：[^\n]*\\approx\s*([\d.]+)/, '更新'),
  };
}

/** 「参数量演算设定约 370 万，而训练样本只有 600 个」 */
function parseScale(text) {
  const m = text.match(/约\s*([\d.]+)\s*万，而训练样本只有\s*(\d+)\s*个/);
  if (!m) throw new Error('正文里没找到「参数量 / 训练样本量」这一句');
  const q = text.match(/每个参数分到\s*([\d.]+)\s*个样本/);
  if (!q) throw new Error('正文里没找到「每个参数分到多少样本」');
  return { params: Number(m[1]) * 1e4, samples: Number(m[2]), quoted: q[1] };
}

/** 「分类任务的参数量最好不超过样本量的 1/10」 */
function parseParamCap(text) {
  const m = text.match(/不超过样本量的\s*1\/(\d+)/);
  if (!m) throw new Error('正文里没找到「不超过样本量的 1/N」这条经验线');
  return Number(m[1]);
}

/** 「600 个样本、准确率 0.85，其 95% 置信区间约 ±0.03」 */
function parseAccuracyReport(text) {
  const m = text.match(/(\d+)\s*个样本、准确率\s*(0\.\d+)，其 95% 置信区间约\s*±\s*(0\.\d+)/);
  if (!m) throw new Error('正文里没找到「样本量 / 准确率 / 置信区间」这一句');
  return { n: Number(m[1]), acc: Number(m[2]), quoted: Number(m[3]) };
}

/** 二项分布均值的 95% 区间半宽：1.96·√(p(1−p)/n) */
function ci95(p, n) {
  return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

function main() {
  const doc = readDoc();
  const n0 = parseNeuron(doc);
  const s = step(n0);
  const ex = parseWorkedExample(doc);
  const scale = parseScale(doc);
  const capDiv = parseParamCap(doc);
  const rep = parseAccuracyReport(doc);

  console.log('═══ 深层网络不是更聪明，是把误差分配得更细 ═══');
  console.log('');

  console.log(`一、一次更新（正文算例：w=${n0.w}, b=${n0.b}, x=${n0.x}, y=${n0.y}, η=${n0.eta}）`);
  const row = (name, got, said, digits) => {
    const d = Math.abs(got - said);
    console.log(`  ${name}  现算 ${got.toFixed(digits)} ｜ 正文 ${said} ｜ 差 ${d.toFixed(5)}${d <= 5e-4 ? '' : '（正文为四舍五入口径）'}`);
  };
  console.log(`  三因子：输出误差 ${s.dOut.toFixed(3)} × 激活导数 ${s.dAct.toFixed(3)} × 输入 ${n0.x}`);
  row('前向 a = σ(z)', s.a, ex.a, 4);
  row('损失 L = ½(a−y)²', s.loss, ex.loss, 5);
  row('梯度 δ', s.delta, ex.delta, 5);
  row('更新后 w', s.w2, ex.w, 5);
  console.log('');
  console.log('  同一条式子读两种病：');
  console.log(`    x = 0 ⇒ 梯度 ${(s.delta * 0).toFixed(4)}，参数不动 —— 稀疏输入学得慢的算术根源；`);
  console.log(`    |z| 大 ⇒ σ'(z) 从 ${(0.25).toFixed(2)} 掉到 ${(sigmoid(5) * (1 - sigmoid(5))).toFixed(4)}（z=5），多层连乘即梯度消失。`);
  console.log('');

  console.log('二、参数／样本比（同一句现读）：');
  const ratio = scale.samples / scale.params;
  console.log(`  训练样本 ${scale.samples} / 参数 ${scale.params.toLocaleString('en-US')} = ${ratio.toFixed(5)} 个样本每参数`);
  console.log(`  正文记 ${scale.quoted}；复算一致：${ratio.toFixed(5) === Number(scale.quoted).toFixed(5) ? '是' : '否'}`);
  console.log(`  经验线「不超过样本量的 1/${capDiv}」 ⇒ 可训练参数上限 ${scale.samples / capDiv} 个`);
  console.log(`  实际参数是上限的 ${Math.round(scale.params / (scale.samples / capDiv)).toLocaleString('en-US')} 倍 —— 正则只能延缓过拟合，不能消除。`);
  console.log('');

  console.log('三、一次准确率的可信度（同一句现读）：');
  const half = ci95(rep.acc, rep.n);
  console.log(`  n=${rep.n}，准确率 ${rep.acc}，95% 区间半宽 ${half.toFixed(4)}（正文记 ±${rep.quoted}）`);
  console.log(`  区间 [${(rep.acc - half).toFixed(3)}, ${(rep.acc + half).toFixed(3)}] —— 落在这里面的差值分不出高下。`);
  console.log('');

  console.log('四、一句话：');
  console.log('  反向传播回答「给定结构如何算梯度」，不回答「给定样本量结构该多大」；后者要看参数／样本比、正则与迁移。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；正文为演算设定，不对应任何实测模型；输出仅用于教学演示，不构成技术选型或临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  sigmoid,
  step,
  parseNeuron,
  parseWorkedExample,
  parseScale,
  parseParamCap,
  parseAccuracyReport,
  ci95,
  main,
};
