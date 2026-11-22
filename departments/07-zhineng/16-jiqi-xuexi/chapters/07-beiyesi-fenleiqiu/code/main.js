#!/usr/bin/env node
/**
 * 机器学习 · 第 7 章 先验不是偏见，是还没看到数据时你唯一能拿出的东西
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/07-beiyesi-fenleiqiu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 14 属性三值、20 条样本的条件概率、先验换算与平滑设定，
 * 重算联合空间规模、一维计数个数、后验、平滑后的条件概率、跨场景先验换算、EM 的责任度，
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

/** 联合空间：∏ n_j */
function jointSpace(dims, values) {
  return Math.pow(values, dims);
}

/** 朴素贝叶斯参数量：|Y| × Σ n_j */
const nbParams = (classes, dims, values) => classes * dims * values;

/** 后验：先验 × 似然，再按两类归一 */
function posterior(prior1, lik1, prior0, lik0) {
  const a = prior1 * lik1;
  const b = prior0 * lik0;
  return a / (a + b);
}

/** 拉普拉斯/利德斯通平滑 */
const smoothed = (count, total, nValues, lambda = 1) => (count + lambda) / (total + lambda * nValues);

/** 按目标先验重算后验：似然比乘上新旧先验几率之比 */
function reweightPosterior(p, piOld, piNew) {
  const odds = p / (1 - p);
  const factor = (piNew / (1 - piNew)) / (piOld / (1 - piOld));
  const next = odds * factor;
  return next / (1 + next);
}

const gauss = (x, mu, sigma) => (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

/** 两成分高斯混合在单点上的责任度 */
function responsibility(x, params) {
  const dens = params.map((p) => p.prior * gauss(x, p.mu, p.sigma));
  const sum = dens.reduce((a, b) => a + b, 0);
  return dens.map((d) => d / sum);
}

function parseSetup(doc) {
  const joint = doc.match(/演算设定\s*(\d+)\s*个属性、每个\s*(\d+)\s*个取值、\s*(\d+)\s*个类别/);
  if (!joint) throw new Error('正文里没找到属性与类别设定');
  const cond = doc.match(/训练集\s*(\d+)\s*条，风寒、风热各\s*(\d+)\s*条/);
  if (!cond) throw new Error('正文里没找到训练集规模');

  return {
    dims: Number(joint[1]),
    values: Number(joint[2]),
    classes: Number(joint[3]),
    declaredJointWan: needNum(doc, /\\approx(\d+)\$?\s*万种组合/, '联合空间（万）'),
    declaredParams: needNum(doc, /从 478 万降到\s*(\d+)/, '一维计数个数'),
    samples: Number(cond[1]),
    perClass: Number(cond[2]),
    pCold: needNum(doc, /0\.5\\times0\.8\\times0\.9\\times0\.9=([\d.]+)/, '风寒类分子'),
    pHot: needNum(doc, /0\.5\\times0\.2\\times0\.1\\times0\.1=([\d.]+)/, '风热类分子'),
    post: needNum(doc, /\+0\.001\)\\approx([\d.]+)\$/, '后验'),
    nValuesLaplace: needNum(doc, /演算设定\s*\$n_j=(\d+)\$/i, '平滑属性取值数'),
    nClass: needNum(doc, /\$N_c=(\d+)\$、\$N_\{c,v\}=0\$/, '类内样本数'),
    smoothedDeclared: needNum(doc, /\\hat\{P\}=1\/12\\approx([\d.]+)/, '平滑后的条件概率'),
    piOld: needNum(doc, /演算设定旧先验\s*([\d.]+)、新先验\s*([\d.]+)/, '旧先验'),
    piNew: needNum(doc, /演算设定旧先验\s*[\d.]+、新先验\s*([\d.]+)/, '新先验'),
    postOld: needNum(doc, /旧后验\s*([\d.]+)\s*对应似然比/, '旧后验'),
    factor: needNum(doc, /=([\d.]+)\$，得新似然比/, '先验几率之比'),
    ratioNew: needNum(doc, /得新似然比\s*\$([\d.]+)\$/, '新似然比'),
    postNew: needNum(doc, /新后验\s*\$([\d.]+)\$/, '新后验'),
    mu1: needNum(doc, /初始均值\s*\$\\mu_1=(\d+)\$/, '成分一均值'),
    mu2: needNum(doc, /初始均值\s*\$\\mu_1=\d+\$、\$\\mu_2=(\d+)\$/, '成分二均值'),
    point: needNum(doc, /一个观测点\s*\$x=(\d+)\$/, '观测点'),
    density: needNum(doc, /密度分别为\s*\$([\d.]+)\$ 与/, '单点密度'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const lik1 = 0.8 * 0.9 * 0.9;
  const lik0 = 0.2 * 0.1 * 0.1;
  const post = posterior(0.5, lik1, 0.5, lik0);
  const resp = responsibility(s.point, [
    { prior: 0.5, mu: s.mu1, sigma: 1 },
    { prior: 0.5, mu: s.mu2, sigma: 1 },
  ]);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('联合空间（万）', Number((jointSpace(s.dims, s.values) / 1e4).toFixed(0)), s.declaredJointWan, 0.6);
  check('一维计数个数', nbParams(s.classes, s.dims, s.values), s.declaredParams, 0);
  check('风寒类分子', Number((0.5 * lik1).toFixed(3)), s.pCold, 0.0005);
  check('风热类分子', Number((0.5 * lik0).toFixed(3)), s.pHot, 0.0005);
  check('后验（3 位小数）', Number(post.toFixed(3)), s.post, 0.0005);
  check('平滑后的条件概率（3 位小数）', Number(smoothed(0, s.nClass, s.nValuesLaplace).toFixed(3)), s.smoothedDeclared, 0.0005);
  const factor = (s.piNew / (1 - s.piNew)) / (s.piOld / (1 - s.piOld));
  check('新旧先验几率之比（4 位小数）', Number(factor.toFixed(4)), s.factor, 0.0001);
  check('新似然比（3 位小数）', Number(((s.postOld / (1 - s.postOld)) * factor).toFixed(3)), s.ratioNew, 0.0015);
  check('新后验（2 位小数）', Number(reweightPosterior(s.postOld, s.piOld, s.piNew).toFixed(2)), s.postNew, 0.005);
  check('单点上的两成分密度（3 位小数）', Number(gauss(s.point, s.mu1, 1).toFixed(3)), s.density, 0.0005);
  check('单点上的责任度', resp[0], 0.5, 1e-12);

  return { setup: s, post, resp, rows, lik1, lik0 };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 7 章 先验不是偏见，是还没看到数据时你唯一能拿出的东西');
  console.log('');
  console.log(`${s.dims} 个 ${s.values} 值属性、${s.classes} 个类别：联合空间 ${jointSpace(s.dims, s.values).toLocaleString('en-US')} 种组合`);
  console.log(`  朴素贝叶斯一维计数只需 ${nbParams(s.classes, s.dims, s.values)} 个，代价是条件独立这个明知为假的假设`);
  console.log('');
  console.log(`20 条样本、两类各 ${s.perClass} 条；新病例「恶寒重、无汗、脉浮紧」：`);
  console.log(`  风寒 0.5×0.8×0.9×0.9=${(0.5 * r.lik1).toFixed(3)}，风热 0.5×0.2×0.1×0.1=${(0.5 * r.lik0).toFixed(3)} → 后验 ${r.post.toFixed(3)}`);
  console.log(`  ${r.post.toFixed(3)} 偏高：三个相关属性的证据被乘了三遍，排序可用、概率不能直接读`);
  console.log('');
  console.log(`零概率与平滑：N_c=${s.nClass}、n_j=${s.nValuesLaplace}、计数 0 → (0+1)/(${s.nClass}+${s.nValuesLaplace})=${smoothed(0, s.nClass, s.nValuesLaplace).toFixed(3)}`);
  console.log('');
  console.log(`跨场景先验换算：旧先验 ${s.piOld}、新先验 ${s.piNew}，旧后验 ${s.postOld} → 新后验 ${reweightPosterior(s.postOld, s.piOld, s.piNew).toFixed(2)}`);
  console.log('');
  console.log(`EM：两成分先验各 0.5，均值 ${s.mu1} 与 ${s.mu2}，观测点 ${s.point} → 责任度 (${r.resp.map((v) => v.toFixed(2)).join(', ')})`);
  console.log(`  向观测点移动半步：均值走到 ${(s.mu1 + 0.5 * (s.point - s.mu1)).toFixed(0)} 与 ${(s.mu2 + 0.5 * (s.point - s.mu2)).toFixed(0)}`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, jointSpace, nbParams, posterior, smoothed, reweightPosterior, gauss, responsibility, reconcile, DOC };
