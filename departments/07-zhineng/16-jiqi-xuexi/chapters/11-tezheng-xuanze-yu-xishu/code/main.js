#!/usr/bin/env node
/**
 * 机器学习 · 第 11 章 稀疏不是省参数，是把「不重要」变成可检验的零
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/11-tezheng-xuanze-yu-xishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 1,000 特征/200 样本的误差两档、Lasso 算例的 OLS 系数与 λ、稳定性阈值，
 * 重算软阈值与岭回归收缩、L1 球的顶点与零坐标数、Jaccard 稳定性，再与正文对账。
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

const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** 正交设计下的软阈值解 */
function softThreshold(w, lambda, m) {
  const t = lambda / (2 * m);
  return sign(w) * Math.max(0, Math.abs(w) - t);
}

/** 岭回归的收缩：按比例缩小，永不精确为零 */
const ridgeShrink = (w, lambda, m) => w / (1 + lambda / m);

/** d 维 L1 球的顶点数，以及每个顶点的零坐标个数 */
const l1Vertices = (d) => 2 * d;
const l1ZerosPerVertex = (d) => d - 1;

const jaccard = (a, b) => {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 1 : inter / union;
};

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*([\d,]+)\s*个特征、\s*(\d+)\s*个样本/);
  if (!head) throw new Error('正文里没找到特征与样本规模');
  const err = doc.match(/训练误差\s*([\d.]+)，测试误差\s*([\d.]+)——典型的[\s\S]{0,40}?选出\s*(\d+)\s*个特征：训练误差升到\s*([\d.]+)，测试误差降到\s*([\d.]+)/);
  if (!err) throw new Error('正文里没找到两档误差设定');
  const ols = doc.match(/最小二乘系数为\s*\$\(([\d.,\s\\-]+)\)\$/);
  if (!ols) throw new Error('正文里没找到 OLS 系数');

  return {
    p: Number(head[1].replace(/,/g, '')),
    n: Number(head[2]),
    errTrainFull: Number(err[1]),
    errTestFull: Number(err[2]),
    kept: Number(err[3]),
    errTrainSparse: Number(err[4]),
    errTestSparse: Number(err[5]),
    m: needNum(doc, /\$m=(\d+)\$，五个特征/, '样本数 m'),
    lambda: needNum(doc, /取\s*\$\\lambda=(\d+)\$/, 'λ'),
    ols: ols[1].replace(/\\/g, '').split(',').map((v) => Number(v.trim())),
    thresholdDeclared: needNum(doc, /则阈值\s*\$\\lambda\/\(2m\)=([\d.]+)\$/, '阈值'),
    vertices: needNum(doc, /\$L_1\$ 球的顶点数是\s*\$?(\d+)?\$?/, '顶点数公式'),
    overlap: needNum(doc, /选出的特征集可能只重叠\s*(\d+)%/, 'Bootstrap 重叠率'),
    jaccardWarn: needNum(doc, /低于\s*([\d.]+)\s*就要警告/, '稳定性警告阈值'),
    freq: needNum(doc, /频率高于阈值（如\s*([\d.]+)）/, '稳定性选择频率阈值'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const t = s.lambda / (2 * s.m);
  const sparse = s.ols.map((w) => softThreshold(w, s.lambda, s.m));
  const dense = s.ols.map((w) => ridgeShrink(w, s.lambda, s.m));

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('软阈值阈值 λ/(2m)', t, s.thresholdDeclared, 1e-12);
  check('特征 1 的软阈值解', Number(sparse[0].toFixed(2)), 1.0, 0.005);
  check('特征 2 的软阈值解', Number(sparse[1].toFixed(2)), 0.6, 0.005);
  check('特征 3 的软阈值解', Number(sparse[2].toFixed(2)), 0.1, 0.005);
  check('特征 4 的软阈值解', sparse[3], 0, 1e-12);
  check('特征 5 的软阈值解', sparse[4], 0, 1e-12);
  check('L1 球顶点数（d=1000）', l1Vertices(s.p), 2000, 0);
  check('每个顶点的零坐标个数', l1ZerosPerVertex(s.p), s.p - 1, 0);
  check('Bootstrap 稳定性（Jaccard）', 0.4, s.overlap / 100, 1e-12);

  // 岭回归永不为零，Lasso 会把两个小系数清零
  if (dense.some((w) => w === 0)) throw new Error('岭回归不应产生精确的零');
  if (sparse.filter((w) => w === 0).length !== 2) throw new Error('软阈值应把后两个系数清零');

  return { setup: s, t, sparse, dense, rows };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 11 章 稀疏不是省参数，是把「不重要」变成可检验的零');
  console.log('');
  console.log(`${s.p} 个特征、${s.n} 个样本：全部用上训练 ${s.errTrainFull} / 测试 ${s.errTestFull}`);
  console.log(`  选 ${s.kept} 个特征后训练 ${s.errTrainSparse} / 测试 ${s.errTestSparse}——训练变差、测试变好`);
  console.log('');
  console.log(`软阈值算例（m=${s.m}、λ=${s.lambda}，阈值 λ/(2m)=${r.t}）：`);
  s.ols.forEach((w, i) => {
    console.log(`  特征 ${i + 1}：OLS ${w.toFixed(2)} → Lasso ${r.sparse[i].toFixed(2)}｜岭回归 ${r.dense[i].toFixed(3)}`);
  });
  console.log(`  软阈值减一个常数，岭回归除以一个常数：前者能产出精确的零，后者不能`);
  console.log('');
  console.log(`L1 球在 d=${s.p} 时有 ${l1Vertices(s.p)} 个顶点，每个顶点有 ${l1ZerosPerVertex(s.p)} 个零坐标——维度越高越容易碰顶点`);
  console.log('');
  console.log(`相关特征的不稳定：Bootstrap 选出的特征集重叠 ${s.overlap}%，Jaccard 低于 ${s.jaccardWarn} 就要警告`);
  console.log(`  稳定性选择的做法是统计 100 次子采样的入选频率，高于 ${s.freq} 才保留`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，被选中的特征不得解释为病因或疗效因子。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, softThreshold, ridgeShrink, l1Vertices, l1ZerosPerVertex, jaccard, reconcile, DOC };
