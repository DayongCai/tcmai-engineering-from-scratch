#!/usr/bin/env node
/**
 * 机器学习 · 第 9 章 没有标签的时候，「相似」是唯一还能定义的东西
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/09-julei/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出四点 k-means 的初始中心、轮廓系数与协方差参数设定，
 * 重算分配步的距离、更新步的中心、轮廓系数公式、协方差参数量与 ARI，
 * 再与正文逐项对账。
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

const euclid = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** 分配步：每个点归最近的中心 */
function assign(points, centers) {
  return points.map((p) => {
    let best = 0;
    let bestD = Infinity;
    centers.forEach((c, i) => {
      const d = euclid(p, c);
      if (d < bestD) { bestD = d; best = i; }
    });
    return { label: best, dist: bestD };
  });
}

/** 更新步：中心移到簇内均值 */
function update(points, labels, k) {
  const centers = [];
  for (let c = 0; c < k; c += 1) {
    const members = points.filter((_, i) => labels[i] === c);
    if (!members.length) { centers.push(null); continue; }
    centers.push([
      members.reduce((a, p) => a + p[0], 0) / members.length,
      members.reduce((a, p) => a + p[1], 0) / members.length,
    ]);
  }
  return centers;
}

/** 轮廓系数：s = (b − a)/max(a,b) */
function silhouette(a, b) {
  const denom = Math.max(a, b);
  if (denom === 0) return 0;
  return (b - a) / denom;
}

/** 每个簇的协方差参数量：d(d+1)/2 */
const covarianceParams = (d) => (d * (d + 1)) / 2;

const choose2 = (n) => (n * (n - 1)) / 2;

/** Rand 指数 */
function randIndex(x, y) {
  const n = x.length;
  let same = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if ((x[i] === x[j]) === (y[i] === y[j])) same += 1;
    }
  }
  return same / choose2(n);
}

/** 调整 Rand 指数：校正随机一致 */
function adjustedRand(x, y) {
  const n = x.length;
  const total = choose2(n);
  const count = (arr) => {
    const m = new Map();
    for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
    return [...m.values()];
  };
  const pairSum = (arr) => count(arr).reduce((a, c) => a + choose2(c), 0);
  const joint = new Map();
  x.forEach((v, i) => {
    const key = `${v}|${y[i]}`;
    joint.set(key, (joint.get(key) || 0) + 1);
  });
  const nij = [...joint.values()].reduce((a, c) => a + choose2(c), 0);
  const ai = pairSum(x);
  const bj = pairSum(y);
  const expected = (ai * bj) / total;
  const maxIndex = 0.5 * (ai + bj);
  return (nij - expected) / (maxIndex - expected);
}

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*(\d+)\s*份病历、\s*(\d+)\s*个属性、取\s*\$k=(\d+)\$/);
  if (!head) throw new Error('正文里没找到样本与 k 的设定');
  const sil = doc.match(/轮廓系数分别是\s*([\d.]+)、([\d.]+)、([\d.]+)/);
  if (!sil) throw new Error('正文里没找到轮廓系数设定');
  const pts = doc.match(/四个点\s*\$\(1,1\),\(2,1\),\(4,3\),\(5,4\)\$，初始中心\s*\$\(1,1\)\$\s*与\s*\$\(5,4\)\$/);
  if (!pts) throw new Error('正文里没找到四点演算设定');

  return {
    n: Number(head[1]),
    dims: Number(head[2]),
    k: Number(head[3]),
    silhouettes: [Number(sil[1]), Number(sil[2]), Number(sil[3])],
    d: needNum(doc, /\$d=(\d+)\$ 时每个簇\s*\d+\s*个/, '协方差维度'),
    perCluster: needNum(doc, /\$d=\d+\$ 时每个簇\s*(\d+)\s*个/, '单簇协方差参数'),
    kGmm: needNum(doc, /\$K=(\d+)\$\s*就有/, 'GMM 成分数'),
    totalCov: Number(need(doc, /就有\s*([\d,]+)\s*个/, '协方差参数总数').replace(/,/g, '')),
    unstable: needNum(doc, /ARI 度量两次聚类的相似度，低于\s*([\d.]+)\s*说明结果不稳/, '稳定性阈值'),
    distFar: needNum(doc, /到两个中心的距离为 1 与\s*([\d.]+)/, '远距离'),
    distNear: needNum(doc, /为\s*([\d.]+)\s*与 1\.41，归/, '近距离'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const points = [[1, 1], [2, 1], [4, 3], [5, 4]];
  const centers0 = [[1, 1], [5, 4]];
  const a1 = assign(points, centers0);
  const c1 = update(points, a1.map((x) => x.label), 2);
  const a2 = assign(points, c1);
  const c2 = update(points, a2.map((x) => x.label), 2);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('第二点到近中心的距离', euclid(points[1], centers0[0]), 1, 1e-9);
  check('第二点到远中心的距离（2 位小数）', Number(euclid(points[1], centers0[1]).toFixed(2)), s.distFar, 0.005);
  check('第三点到远中心的距离（2 位小数）', Number(euclid(points[2], centers0[0]).toFixed(2)), s.distNear, 0.005);
  check('更新后的第一簇中心 x', c1[0][0], 1.5, 1e-12);
  check('更新后的第二簇中心 y', c1[1][1], 3.5, 1e-12);
  check('单簇协方差参数', covarianceParams(s.d), s.perCluster, 0);
  check('协方差参数总数', covarianceParams(s.d) * s.kGmm, s.totalCov, 0);
  check('完全一致划分的 ARI', adjustedRand([0, 0, 1, 1], [0, 0, 1, 1]), 1, 1e-12);
  check('轮廓系数的取值范围样例', silhouette(1, 3), 2 / 3, 1e-12);

  const stable = a2.every((x, i) => x.label === a1[i].label);
  if (!stable) throw new Error('第二轮分配与第一轮不一致，与正文不符');

  return { setup: s, points, centers0, a1, c1, a2, c2, rows, stable };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 9 章 没有标签的时候，「相似」是唯一还能定义的东西');
  console.log('');
  console.log(`${s.n} 份病历、${s.dims} 个属性、k=${s.k}；三种距离下的轮廓系数 ${s.silhouettes.join(' / ')}`);
  console.log(`  内部指标只能比同一算法同一距离下的不同 k，不能用来判定哪一组「对」`);
  console.log('');
  console.log('四点 k-means（一 = (1,1)、二 = (5,4)）：');
  r.points.forEach((p, i) => {
    console.log(`  (${p.join(',')}) → 簇 ${r.a1[i].label + 1}，最近距离 ${r.a1[i].dist.toFixed(2)}`);
  });
  console.log(`  更新后中心 (${r.c1[0].join(',')}) 与 (${r.c1[1].join(',')})；第二轮分配${r.stable ? '不变，算法终止' : '仍在变化'}`);
  console.log('');
  console.log(`协方差参数：d=${s.d} 时每簇 ${covarianceParams(s.d)} 个，K=${s.kGmm} 共 ${covarianceParams(s.d) * s.kGmm} 个`);
  console.log(`  样本少时必须约束协方差，否则参数比样本还多`);
  console.log('');
  console.log(`稳定性判据：两次聚类的 ARI 低于 ${s.unstable} 说明结果不稳，不宜作为结论`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，分组结果不构成任何证型分类主张。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, euclid, assign, update, silhouette, covarianceParams, randIndex, adjustedRand, reconcile, DOC };
