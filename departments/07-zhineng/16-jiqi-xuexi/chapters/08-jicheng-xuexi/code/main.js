#!/usr/bin/env node
/**
 * 机器学习 · 第 8 章 弱学习器不是凑数，是要它们错得不一样
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/08-jicheng-xuexi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 21 个 0.65 分类器、方差设定的 σ²/ρ/M、三档误差、AdaBoost 的一轮权重、
 * GBDT 与两个基线的 AUC，重算投票准确率、集成方差、袋外比例、话语权与权重，再与正文对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc(file = DOC) {
  if (!fs.existsSync(file)) throw new Error('找不到正文: ' + file);
  return fs.readFileSync(file, 'utf8');
}

function need(text, re, label, group = 1) {
  const m = text.match(re);
  if (!m) throw new Error('正文里没找到' + label + '的设定');
  return m[group];
}
const needNum = (t, re, l, g) => Number(need(t, re, l, g));

function binom(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return r;
}

/** 多数投票的正确率：21 个奇数模型，票数过半即正确 */
function voteAccuracy(m, p) {
  const half = Math.floor(m / 2) + 1;
  let acc = 0;
  for (let k = half; k <= m; k += 1) acc += binom(m, k) * p ** k * (1 - p) ** (m - k);
  return acc;
}

/** 平均模型的方差：ρσ² + (1−ρ)σ²/M */
const ensembleVar = (sigma2, rho, m) => rho * sigma2 + ((1 - rho) * sigma2) / m;

/** 有放回抽样下，单个基学习器见不到的样本比例 */
const oobShare = (m) => Math.pow(1 - 1 / m, m);

const adaAlpha = (eps) => 0.5 * Math.log((1 - eps) / eps);

/** AdaBoost 一轮：更新权重并归一化 */
function adaStep(weights, alpha, wrongIndex) {
  const next = weights.map((w, i) => (i === wrongIndex ? w * Math.exp(alpha) : w * Math.exp(-alpha)));
  const sum = next.reduce((a, b) => a + b, 0);
  return next.map((w) => w / sum);
}

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*(\d+)\s*个二分类器，每个准确率\s*([\d.]+)/);
  if (!head) throw new Error('正文里没找到基分类器设定');
  const v = doc.match(/\$\\sigma\^2=([\d.]+)\$、\$\\rho=([\d.]+)\$、\$M=(\d+)\$/);
  if (!v) throw new Error('正文里没找到方差设定');
  const errs = doc.match(/单棵测试误差\s*([\d.]+)（方差主导）。Bagging 后\s*([\d.]+)，随机森林[\s\S]{0,20}?后\s*([\d.]+)/);
  if (!errs) throw new Error('正文里没找到三档误差设定');
  const auc = doc.match(/测试 AUC\s*([\d.]+)；同数据的逻辑回归\s*([\d.]+)，随机森林\s*([\d.]+)/);
  if (!auc) throw new Error('正文里没找到 AUC 对比设定');
  const weights = need(doc, /归一化后\s*\$\(([\d.,]+)\)\$/, '归一化权重').split(',').map(Number);

  return {
    m: Number(head[1]),
    p: Number(head[2]),
    declaredVote: needNum(doc, /=\$?\$?([\d.]+)\$——从 0\.65 涨到/, '独立投票准确率'),
    sigma2: Number(v[1]),
    rho: Number(v[2]),
    bigM: Number(v[3]),
    varHigh: needNum(doc, /=0\.032\+([\d.]+)=([\d.]+)\$/, '高相关时的方差', 2),
    varLow: needNum(doc, /\$0\.008\+([\d.]+)=([\d.]+)\$/, '低相关时的方差', 2),
    oob: needNum(doc, /约\s*\$?([\d.]+)\\?%?\$?\s*的原始样本/, '袋外比例'),
    errTree: Number(errs[1]),
    errBag: Number(errs[2]),
    errForest: Number(errs[3]),
    epsDen: needNum(doc, /\\epsilon_1=1\/(\d+)\$/, '第一轮错误率的分母'),
    alpha: needNum(doc, /\\alpha_1=[\s\S]{0,80}?=([\d.]+)\$/, '第一轮话语权'),
    weights,
    aucGbdt: Number(auc[1]),
    aucLr: Number(auc[2]),
    aucRf: Number(auc[3]),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const vote = voteAccuracy(s.m, s.p);
  const varHigh = ensembleVar(s.sigma2, s.rho, s.bigM);
  const varLow = ensembleVar(s.sigma2, 0.2, s.bigM);
  const alpha = adaAlpha(1 / s.epsDen);
  const nextW = adaStep([1 / 3, 1 / 3, 1 / 3], alpha, 1);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('独立投票正确率（3 位小数）', Number(vote.toFixed(3)), s.declaredVote, 0.0005);
  check('ρ=0.8 时的集成方差（4 位小数）', Number(varHigh.toFixed(4)), s.varHigh, 0.00005);
  check('ρ=0.2 时的集成方差（5 位小数）', Number(varLow.toFixed(5)), s.varLow, 0.000005);
  check('袋外比例（1 位小数）', Number(((1 - oobShare(1000)) * 100).toFixed(1)), s.oob, 0.05);
  check('第一轮话语权（3 位小数）', Number(alpha.toFixed(3)), s.alpha, 0.0005);
  check('归一化权重（2 位小数）', Number(nextW[1].toFixed(2)), s.weights[1], 0.005);
  check('权重仍归一', nextW.reduce((a, b) => a + b, 0), 1, 1e-12);

  // 顺序关系：单棵 > Bagging > 随机森林；GBDT > 随机森林 > 逻辑回归
  if (!(s.errTree > s.errBag && s.errBag > s.errForest)) throw new Error('三档误差顺序不对');
  if (!(s.aucGbdt > s.aucRf && s.aucRf > s.aucLr)) throw new Error('AUC 排序不对');

  return { setup: s, vote, varHigh, varLow, alpha, nextW, rows };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 8 章 弱学习器不是凑数，是要它们错得不一样');
  console.log('');
  console.log(`${s.m} 个准确率 ${s.p} 的分类器，多数投票：`);
  console.log(`  错误独立 → ${r.vote.toFixed(3)}；错误完全相关 → 仍是 ${s.p}`);
  console.log('');
  console.log(`集成方差（σ²=${s.sigma2}，M=${s.bigM}）：ρ=${s.rho} → ${r.varHigh.toFixed(4)}；ρ=0.2 → ${r.varLow.toFixed(5)}`);
  console.log(`  ρ 由数据与算法决定：第一项 ρσ² 是地板，加多少模型都跨不过去`);
  console.log('');
  console.log(`有放回抽样：每个基学习器见不到 ${((1 - oobShare(1000)) * 100).toFixed(1)}% 的样本，可当免费验证集`);
  console.log('');
  console.log(`AdaBoost 一轮（ε=1/3）：α=${r.alpha.toFixed(3)}，权重 (1/3,1/3,1/3) → (${r.nextW.map((v) => v.toFixed(2)).join(', ')})`);
  console.log(`  下一轮学习器必须优先把上一轮错的那条判对`);
  console.log('');
  console.log(`同一份表格数据：GBDT ${s.aucGbdt} > 随机森林 ${s.aucRf} > 逻辑回归 ${s.aucLr}`);
  console.log(`三档树误差：单棵 ${s.errTree} → Bagging ${s.errBag} → 随机森林 ${s.errForest}（顺序不能颠倒）`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, binom, voteAccuracy, ensembleVar, oobShare, adaAlpha, adaStep, reconcile, DOC };
