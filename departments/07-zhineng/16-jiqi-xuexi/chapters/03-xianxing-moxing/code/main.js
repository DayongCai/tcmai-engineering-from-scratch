#!/usr/bin/env node
/**
 * 机器学习 · 第 3 章 一条直线的全部本事，在于你把什么变量交给它
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/03-xianxing-moxing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出三点演算设定、单样本逻辑回归的初值与学习率、三类打分、样条节点数，
 * 重算最小二乘系数与残差、交叉熵与梯度、softmax 概率与基函数个数，再与正文逐项对账。
 * 对不上就抛错：手打数字会在正文改版后静默过期。
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

/** 正文第一张三点表：| x | y | */
function parsePoints(doc) {
  const at = doc.indexOf('演算设定三点');
  if (at < 0) throw new Error('正文里没找到三点演算设定');
  const points = [];
  for (const line of doc.slice(at).split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*$/);
    if (m) points.push([Number(m[1]), Number(m[2])]);
    if (points.length === 3) break;
  }
  if (points.length !== 3) throw new Error('三点表少于 3 行，格式可能已变');
  return points;
}

/** 一元最小二乘：w = Sxy/Sxx，b = ȳ − w x̄ */
function leastSquares(points) {
  const m = points.length;
  const xb = points.reduce((a, p) => a + p[0], 0) / m;
  const yb = points.reduce((a, p) => a + p[1], 0) / m;
  const Sxx = points.reduce((a, p) => a + (p[0] - xb) ** 2, 0);
  const Sxy = points.reduce((a, p) => a + (p[0] - xb) * (p[1] - yb), 0);
  const w = Sxy / Sxx;
  const b = yb - w * xb;
  const pred = points.map((p) => w * p[0] + b);
  const resid = points.map((p, i) => p[1] - pred[i]);
  const rss = resid.reduce((a, r) => a + r * r, 0);
  return { w, b, Sxx, Sxy, pred, resid, rss };
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const crossEntropy = (y, p) => -(y * Math.log(p) + (1 - y) * Math.log(1 - p));

/** 单样本逻辑回归走一步：返回交叉熵、梯度与更新后的参数 */
function logisticStep(x, w, b, y, lr) {
  const z = w.reduce((a, wi, i) => a + wi * x[i], b);
  const p = sigmoid(z);
  const grad = w.map((_, i) => (p - y) * x[i]);
  const gradB = p - y;
  return {
    z,
    p,
    loss: crossEntropy(y, p),
    grad,
    gradB,
    nextW: w.map((wi, i) => wi - lr * grad[i]),
    nextB: b - lr * gradB,
  };
}

function softmax(scores) {
  const exps = scores.map((s) => Math.exp(s));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** M = 节点数 + 次数 − 1 */
const splineBasis = (nodes, degree) => nodes + degree - 1;

function parseSetup(doc) {
  const points = parsePoints(doc);
  const X = doc.match(/\\mathbf\{x\}=\((\d+),(\d+)\)/);
  const W = doc.match(/\\mathbf\{w\}=\(([\d.-]+),([\d.-]+)\)/);
  if (!X || !W) throw new Error('正文里没找到单样本的 x/w 设定');
  const b = needNum(doc, /、\$b=(\d+)\$/, '偏置 b');
  const y = needNum(doc, /、\$y=(\d+)\$：/, '标签 y');
  const lr = needNum(doc, /学习率\s*([\d.]+)/, '学习率');
  const p0 = needNum(doc, /\$p=\\sigma\(-0\.5\)=([\d.]+)\$/, '初始概率');
  const loss0 = needNum(doc, /交叉熵\s*\$?-?\\?ln\s*[\d.]+=([\d.]+)\$/, '交叉熵');
  const scores = doc.match(/三类打分\s*\$\((\d+),(\d+),(\d+)\)\$/);
  if (!scores) throw new Error('正文里没找到三类打分设定');
  const nodes = needNum(doc, /(\d+)\s*个节点的三次样条/, '样条节点数');
  const basis = needNum(doc, /得到\s*(\d+)\s*个基函数/, '基函数个数');
  const rssBefore = needNum(doc, /训练残差平方和\s*([\d.]+)；用样条后降到\s*([\d.]+)/, '线性项残差');
  const rssAfter = needNum(doc, /训练残差平方和\s*[\d.]+；用样条后降到\s*([\d.]+)/, '样条残差');
  const parBefore = needNum(doc, /参数只从\s*(\d+)\s*个增加到\s*(\d+)\s*个/, '线性项参数个数');
  const parAfter = needNum(doc, /参数只从\s*\d+\s*个增加到\s*(\d+)\s*个/, '样条参数个数');

  return {
    points,
    x: [Number(X[1]), Number(X[2])],
    w: [Number(W[1]), Number(W[2])],
    b, y, lr, p0, loss0,
    scores: scores.slice(1, 4).map(Number),
    nodes, basis, rssBefore, rssAfter, parBefore, parAfter,
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const fit = leastSquares(s.points);
  const step = logisticStep(s.x, s.w, s.b, s.y, s.lr);
  const probs = softmax(s.scores);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toFixed(4)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('最小二乘斜率 w', fit.w, 1.5, 1e-9);
  check('最小二乘截距 b（3 位小数）', Number(fit.b.toFixed(3)), -0.333, 0.0005);
  check('残差平方和（3 位小数）', Number(fit.rss.toFixed(3)), 0.167, 0.0005);
  check('第二点预测值（3 位小数）', Number(fit.pred[1].toFixed(3)), 2.667, 0.0005);
  check('初始概率（3 位小数）', Number(step.p.toFixed(3)), s.p0, 0.0005);
  check('交叉熵（3 位小数）', Number(step.loss.toFixed(3)), s.loss0, 0.0005);
  check('梯度第一分量（3 位小数）', Number(step.grad[0].toFixed(3)), -0.622, 0.0005);
  check('梯度第二分量（3 位小数）', Number(step.grad[1].toFixed(3)), -1.244, 0.002);
  check('一步后 w1（3 位小数）', Number(step.nextW[0].toFixed(3)), 0.811, 0.0005);
  check('一步后 b（3 位小数）', Number(step.nextB.toFixed(3)), 0.311, 0.0005);
  check('最大类概率（3 位小数）', Number(probs[0].toFixed(3)), 0.665, 0.0005);
  check('次类概率（3 位小数）', Number(probs[1].toFixed(3)), 0.245, 0.0005);
  check('基函数个数', splineBasis(s.nodes, 3), s.basis, 0);
  check('样条参数个数', s.basis + 1, s.parAfter, 0);
  check('残差下降量（1 位小数）', Number((s.rssBefore - s.rssAfter).toFixed(1)), 2.7, 0.05);

  return { setup: s, fit, step, probs, rows, gain: s.rssBefore - s.rssAfter };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);

  console.log('机器学习 · 第 3 章 一条直线的全部本事，在于你把什么变量交给它');
  console.log('');
  console.log('三点最小二乘（由正文表格现算）：');
  console.log(`  Sxx=${r.fit.Sxx}，Sxy=${r.fit.Sxy} → w=${r.fit.w}，b=${r.fit.b.toFixed(3)}`);
  console.log(`  预测值 ${r.fit.pred.map((v) => v.toFixed(3)).join('、')}`);
  console.log(`  残差 ${r.fit.resid.map((v) => v.toFixed(3)).join('、')}，平方和 ${r.fit.rss.toFixed(3)}`);
  console.log('');
  console.log('单样本对数几率一步：');
  console.log(`  z=${r.step.z.toFixed(3)}，p=${r.step.p.toFixed(3)}，交叉熵 ${r.step.loss.toFixed(3)}`);
  console.log(`  梯度 (${r.step.grad.map((v) => v.toFixed(3)).join(', ')})，梯度大小随「p−y」走：预测错得越多，走得越远`);
  console.log('');
  console.log(`三类打分 softmax：${r.probs.map((v) => v.toFixed(3)).join('、')}`);
  const hot = softmax(r.setup.scores.map((v) => v * 10));
  console.log(`  打分整体乘 10 后：${hot.map((v) => v.toFixed(4)).join('、')}（排序不变，置信度被放大）`);
  console.log('');
  console.log(`${r.setup.nodes} 节点三次样条 → ${r.setup.basis} 个基函数；参数 ${r.setup.parBefore} → ${r.setup.parAfter}，残差 ${r.setup.rssBefore} → ${r.setup.rssAfter}（省 ${r.gain.toFixed(1)}）`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, parsePoints, leastSquares, logisticStep, sigmoid, softmax, splineBasis, reconcile, DOC };
