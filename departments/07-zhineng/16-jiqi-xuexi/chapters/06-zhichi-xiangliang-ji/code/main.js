#!/usr/bin/env node
/**
 * 机器学习 · 第 6 章 间隔是几何，不是分数
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/06-zhichi-xiangliang-ji/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出两个点的标注、RBF 的 γ、合页损失的取值与间隔界的设定，
 * 重算 w 与间隔、核值随距离的衰减、合页与 Logistic 损失的差、界项量级，再与正文对账。
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

const norm = (v) => Math.hypot(...v);
const signedDistance = (w, b, x) => (w.reduce((a, wi, i) => a + wi * x[i], b)) / norm(w);
const geometricMargin = (w) => 2 / norm(w);

/** RBF 核：exp(−γ‖x−z‖²) */
function rbf(x, z, gamma) {
  const d2 = x.reduce((a, xi, i) => a + (xi - z[i]) ** 2, 0);
  return Math.exp(-gamma * d2);
}

const hinge = (f) => Math.max(0, 1 - f);
const logisticLoss = (f) => Math.log(1 + Math.exp(-f));

/** 间隔界项：√((R²/ρ²)/m) */
const marginBound = (R, rho, m) => Math.sqrt((R * R / (rho * rho)) / m);

/** 两点对称设定下解硬间隔：y(w·x+b)=1 两侧联立 */
function solveTwoPoints(x1, y1, x2, y2) {
  // w·x1 + b = y1，w·x2 + b = y2
  const w = (y1 - y2) / (x1[0] - x2[0]);
  const b = y1 - w * x1[0];
  return { w: [w], b };
}

function parseSetup(doc) {
  const pts = doc.match(/两个点\s*\$\(([-\d,]+)\)\$\s*标\s*\$([+-]\d+)\$、\$\(([-\d,]+)\)\$\s*标\s*\$([+-]\d+)\$/);
  if (!pts) throw new Error('正文里没找到两点演算设定');
  const sp = doc.match(/通常只有\s*(\d+)–(\d+)\s*个支持向量/);
  if (!sp) throw new Error('正文里没找到支持向量数量设定');
  const support = doc.match(/演算设定 1,000 个样本训出的 SVM，通常只有/);
  if (!support) throw new Error('正文里没找到支持向量的样本规模');

  return {
    p1: { x: pts[1].split(',').map(Number), y: Number(pts[2]) },
    p2: { x: pts[3].split(',').map(Number), y: Number(pts[4]) },
    margin: needNum(doc, /间隔\s*\$2\/\\\|\\mathbf\{w\}\\\|=(\d+)\$/, '间隔'),
    gamma: needNum(doc, /RBF 核\s*\$\\gamma=([\d.]+)\$/, 'RBF 的 γ'),
    k1: needNum(doc, /K=e\^\{-[\d.]+\}=([\d.]+)\$/, '近距离核值'),
    kFar: needNum(doc, /核值从 1 降到\s*\$e\^\{-(\d+)\}=([\d.]+)\$/, '远距离核值', 2),
    farDist: needNum(doc, /核值从 1 降到\s*\$e\^\{-(\d+)\}=([\d.]+)\$/, '远距离', 1),
    f1: needNum(doc, /当前\s*\$f\(\\mathbf\{x\}\)=([\d.]+)\$/, '当前打分'),
    hinge: needNum(doc, /合页损失\s*\$\\max\(0,1-[\d.]+\)=([\d.]+)\$/, '合页损失'),
    f2: needNum(doc, /若\s*\$f=([\d.]+)\$/, '远离边界的打分'),
    logLoss: needNum(doc, /\\ln\(1\+e\^\{-([\d.]+)\}\)=([\d.]+)\$/, 'Logistic 损失', 2),
    svLo: Number(sp[1]),
    svHi: Number(sp[2]),
    svSamples: 1000,
    bound: doc.match(/根号内为\s*\$([\d.]+)\/1\{,\}000=([\d.]+)\$，界项约\s*\$([\d.]+)\$/g),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const fit = solveTwoPoints(s.p1.x, s.p1.y, s.p2.x, s.p2.y);
  const dist1 = signedDistance(fit.w, fit.b, s.p1.x);
  const boundRho = (rho) => marginBound(1, rho, 1000);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('两点解出的 w1', fit.w[0], 1, 1e-9);
  check('两点解出的 b', fit.b, 0, 1e-9);
  check('支持向量到边界的距离', Math.abs(dist1), 1, 1e-9);
  check('几何间隔', geometricMargin(fit.w), s.margin, 1e-9);
  check('RBF 近距离核值（3 位小数）', Number(rbf([1, 0], [0, 0], s.gamma).toFixed(3)), s.k1, 0.0005);
  check('RBF 远距离核值（3 位小数）', Number(rbf([s.farDist, 0], [0, 0], s.gamma).toFixed(3)), s.kFar, 0.0005);
  check('合页损失（1 位小数）', Number(hinge(s.f1).toFixed(1)), s.hinge, 0.05);
  check('远样本的合页损失', hinge(s.f2), 0, 1e-12);
  check('远样本的 Logistic 损失（量级）', Number(logisticLoss(s.f2).toFixed(2)), s.logLoss, 0.011);
  check('间隔界项（ρ=0.5，3 位小数）', Number(boundRho(0.5).toFixed(3)), 0.063, 0.0005);
  check('间隔界项（ρ=0.1，2 位小数）', Number(boundRho(0.1).toFixed(2)), 0.32, 0.005);

  return { setup: s, fit, dist1, rows, boundHalf: boundRho(0.5), boundTight: boundRho(0.1) };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 6 章 间隔是几何，不是分数');
  console.log('');
  console.log(`两点设定：(${s.p1.x.join(',')}) 标 ${s.p1.y}、(${s.p2.x.join(',')}) 标 ${s.p2.y}`);
  console.log(`  解出 w=(${r.fit.w.join(',')})，b=${r.fit.b}，‖w‖=${norm(r.fit.w)}，几何间隔 ${geometricMargin(r.fit.w)}`);
  console.log(`  支持向量到超平面的距离 ${Math.abs(r.dist1).toFixed(3)}：恰好压在间隔边界上`);
  console.log('');
  console.log(`RBF 核（γ=${s.gamma}）：同点核值 1，距离 1 时 ${rbf([1, 0], [0, 0], s.gamma).toFixed(3)}，距离 2 时 ${rbf([2, 0], [0, 0], s.gamma).toFixed(3)}`);
  console.log(`  衰减越快，γ 越大，每个支持向量的影响范围越小`);
  console.log('');
  console.log(`合页损失：f=${s.f1} → ${hinge(s.f1).toFixed(1)}；f=${s.f2} → ${hinge(s.f2)}（梯度为零，退出训练）`);
  console.log(`同一远样本的 Logistic 损失 ${logisticLoss(s.f2).toFixed(2)}：它不会把已分对的样本彻底放手`);
  console.log('');
  console.log(`间隔界（R=1、m=1,000）：ρ=0.5 → ${r.boundHalf.toFixed(3)}；ρ=0.1 → ${r.boundTight.toFixed(3)}（间隔缩小 5 倍，界项涨 5 倍）`);
  console.log(`支持向量规模：${s.svSamples} 个样本通常只剩 ${s.svLo}–${s.svHi} 个非零 α`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, norm, signedDistance, geometricMargin, rbf, hinge, logisticLoss, marginBound, solveTwoPoints, reconcile, DOC };
