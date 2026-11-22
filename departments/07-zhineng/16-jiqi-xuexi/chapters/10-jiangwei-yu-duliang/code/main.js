#!/usr/bin/env node
/**
 * 机器学习 · 第 10 章 降维不是丢信息，是换一组能算距离的坐标
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/10-jiangwei-yu-duliang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出维度、样本量、准确率三档、协方差矩阵与判别/噪声方差对比，
 * 重算距离均值与相对波动、外壳体积占比、特征值、解释方差比与重构误差，再与正文对账。
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

/** 单位超立方体里两点距离的期望与标准差（正文给出的量级） */
const distMean = (d) => Math.sqrt(d / 6);
const DIST_STD = Math.sqrt(7 / 360);
const relSpread = (d) => DIST_STD / distMean(d);

/** 半径 1−ε 的内接球占总体积的比例 */
const coreVolume = (d, eps) => Math.pow(1 - eps, d);

/** 2×2 对称矩阵的特征值（降序） */
function eig2(a, b, d) {
  const mid = (a + d) / 2;
  const rad = Math.sqrt(((a - d) / 2) ** 2 + b * b);
  return [mid + rad, mid - rad];
}

function matVec(M, v) {
  return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
}

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*(\d+)\s*个特征、\s*(\d+)\s*个样本/);
  if (!head) throw new Error('正文里没找到特征与样本设定');
  const acc = doc.match(/准确率是\s*([\d.]+)；把方差最小的 10 个维度直接删掉，准确率反而升到\s*([\d.]+)；再降到 3 维，是\s*([\d.]+)/);
  if (!acc) throw new Error('正文里没找到三档准确率');

  return {
    d: Number(head[1]),
    m: Number(head[2]),
    accFull: Number(acc[1]),
    acc10: Number(acc[2]),
    acc3: Number(acc[3]),
    mean20: needNum(doc, /\$d=20\$ 时，均值\s*([\d.]+)/, '20 维距离均值'),
    mean1000: needNum(doc, /\$d=1\{,\}000\$ 时，均值\s*([\d.]+)/, '1000 维距离均值'),
    rel20: needNum(doc, /相对波动\s*([\d.]+)%/, '20 维相对波动'),
    rel1000: needNum(doc, /均值 12\.9、标准差 0\.139，相对波动\s*([\d.]+)%/, '1000 维相对波动'),
    shell: needNum(doc, /只有\s*\$0\.9\^\{20\}=([\d.]+)\$/, '内接球体积比'),
    shellDeclared: needNum(doc, /——(\d+)% 的体积在外壳/, '外壳占比'),
    lambda1: needNum(doc, /特征值为\s*\$(\d+)\$\s*与\s*\$(\d+)\$/, '第一特征值'),
    lambda2: needNum(doc, /特征值为\s*\$\d+\$\s*与\s*\$(\d+)\$/, '第二特征值'),
    explained: needNum(doc, /第一主成分解释了\s*\$3\/\(3\+1\)=(\d+)\\%?\$/, '第一主成分解释比'),
    reconErr: needNum(doc, /重构误差是\s*\$\\lambda_2=(\d+)\$/, '重构误差'),
    discVar: needNum(doc, /判别方向方差只有\s*([\d.]+)/, '判别方向方差'),
    noiseVar: needNum(doc, /噪声方向方差是\s*([\d.]+)/, '噪声方向方差'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const M = [[2, 1], [1, 2]];
  const eig = eig2(2, 1, 2);
  const total = eig[0] + eig[1];
  const v1 = [1 / Math.SQRT2, 1 / Math.SQRT2];

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('20 维距离均值（2 位小数）', Number(distMean(20).toFixed(2)), s.mean20, 0.005);
  check('1000 维距离均值（1 位小数）', Number(distMean(1000).toFixed(1)), s.mean1000, 0.05);
  check('20 维相对波动（百分点）', Number((relSpread(20) * 100).toFixed(1)), s.rel20, 0.05);
  check('1000 维相对波动（百分点）', Number((relSpread(1000) * 100).toFixed(1)), s.rel1000, 0.05);
  check('内接球体积比（2 位小数）', Number(coreVolume(20, 0.1).toFixed(2)), s.shell, 0.005);
  check('外壳占比（百分点）', Number(((1 - coreVolume(20, 0.1)) * 100).toFixed(0)), s.shellDeclared, 0.5);
  check('第一特征值', eig[0], s.lambda1, 1e-9);
  check('第二特征值', eig[1], s.lambda2, 1e-9);
  check('第一主成分解释比（百分点）', Number(((eig[0] / total) * 100).toFixed(0)), s.explained, 0.5);
  check('降到一维的重构误差', Math.min(...eig), s.reconErr, 1e-9);

  // 特征向量满足 Σw = λw
  const Mw = matVec(M, v1);
  check('主方向满足 Σw=λw', Number((Mw[0] / v1[0]).toFixed(6)), Number(eig[0].toFixed(6)), 1e-9);

  // 三档准确率的高低关系：删维先升后降
  if (!(s.acc10 > s.accFull && s.acc10 > s.acc3)) throw new Error('三档准确率的顺序与正文不符');

  return { setup: s, eig, total, rows, noiseWins: s.noiseVar > s.discVar };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 10 章 降维不是丢信息，是换一组能算距离的坐标');
  console.log('');
  console.log(`${s.d} 个特征、${s.m} 个样本，k 近邻准确率 ${s.accFull} → 删到 10 维 ${s.acc10} → 3 维 ${s.acc3}`);
  console.log(`  删维反而变好，说明瓶颈在距离度量，不在特征数量`);
  console.log('');
  console.log('距离集中：');
  console.log(`  d=20：均值 ${distMean(20).toFixed(2)}，标准差 ${DIST_STD.toFixed(3)}，相对波动 ${(relSpread(20) * 100).toFixed(1)}%`);
  console.log(`  d=1000：均值 ${distMean(1000).toFixed(1)}，相对波动 ${(relSpread(1000) * 100).toFixed(1)}%——最近邻与最远邻几乎一样远`);
  console.log(`  半径 0.9 的内接球只占 ${(coreVolume(20, 0.1) * 100).toFixed(0)}% 的体积，${((1 - coreVolume(20, 0.1)) * 100).toFixed(0)}% 在外壳`);
  console.log('');
  console.log(`协方差矩阵 [[2,1],[1,2]] 的特征值 ${r.eig[0]} 与 ${r.eig[1]}，第一主成分解释 ${((r.eig[0] / r.total) * 100).toFixed(0)}% 的方差`);
  console.log(`  降到一维的重构误差 = ${Math.min(...r.eig)}，占总方差 ${((Math.min(...r.eig) / r.total) * 100).toFixed(0)}%：这是可以写进报告的真实代价`);
  console.log('');
  console.log(`方差与判别无关的例子：判别方向方差 ${s.discVar} 对噪声方向方差 ${s.noiseVar}，PCA 会选后者`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，降维后的特征不得解释为生理指标。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, distMean, relSpread, coreVolume, eig2, matVec, reconcile, DOC };
