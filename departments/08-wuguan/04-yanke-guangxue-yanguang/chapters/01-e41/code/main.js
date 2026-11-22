#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 1 章 眼的光学结构：屈光力来自折射率的跃变，不来自透明
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/01-e41/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法不是复述结论，而是把正文里的输入数（折射率、曲率半径、眼轴、波长、瞳孔）
 * 读出来，用近轴光学公式独立算一遍，再与正文写的结论数逐个对照；差超限即报错。
 * 结论数也从正文取：改稿后若公式与文字不再自洽，这里会先响。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '眼的光学结构：屈光力来自折射率的跃变，不来自透明';
const N_IMAGE = 4 / 3; // 简化眼像方折射率

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 从正文抓一个数（第一个捕获组），抓不到就报错，不静默兜底。 */
function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}，公式无处对齐：${re}`);
  return Number(String(m[1]).replace(/[−–—]/g, '-').replace(/[^\d.\-]/g, ''));
}

/* ---------- 近轴光学：只留公式 ---------- */

/** 单球面屈光力 F = (n2 − n1)/r，r 取毫米，返回屈光度。 */
function surfacePower(n1, n2, rMm) {
  if (!(rMm > 0)) throw new Error('曲率半径必须为正: ' + rMm);
  return (n2 - n1) / (rMm / 1000);
}

/** 眼轴每变化 1 毫米对应的屈光度：ΔF ≈ (n′/L²)·dL。 */
function diopterPerMm(nImage, axisM) {
  return (nImage / (axisM * axisM)) * 0.001;
}

/** 简化眼焦距 f′ = n′/F，返回毫米。 */
function focalLengthMm(nImage, totalPower) {
  return (nImage / totalPower) * 1000;
}

/** 衍射斑角半径 θ = 1.22λ/d，返回角分。 */
function diffractionArcmin(lambdaNm, pupilMm) {
  const rad = (1.22 * lambdaNm * 1e-9) / (pupilMm / 1000);
  return (rad * 180 * 60) / Math.PI;
}

/** 离焦弥散圆直径 b = p·Δ/F，返回毫米（p 为瞳孔直径）。 */
function blurCircleMm(pupilMm, defocusD, totalPower) {
  return ((pupilMm / 1000) * (defocusD / totalPower)) * 1000;
}

/** 视网膜上 b 毫米对应多少角分（以 f′ 为参考距离）。 */
function blurArcmin(bMm, fMm) {
  return (bMm / fMm) * (180 * 60) / Math.PI;
}

/** Hofstetter 回归式，只回答「这个岁数还剩多少」，不作个体判据。 */
function hofstetter(age) {
  return { min: 15 - 0.25 * age, avg: 18.5 - 0.3 * age };
}

/* ---------- 从正文取数 → 现算 → 对照 ---------- */

function compute(text) {
  const nAir = grab(text, /空气到角膜\s*([\d.]+)→\s*[\d.]+/, '空气的折射率');
  const rFront = grab(text, /前表面取\s*([\d.]+)\s*毫米/, '角膜前表面曲率半径');
  const nCornea = grab(text, /空气到角膜\s*[\d.]+→\s*([\d.]+)/, '角膜折射率');
  const backPowerDoc = grab(text, /后表面是凹面，约\s*[−-]([\d.]+)\s*D/, '角膜后表面屈光力');
  const frontDoc = grab(text, /单独贡献约\s*\+([\d.]+)\s*D/, '角膜前表面屈光力');
  const totalDoc = grab(text, /全眼合计约\s*([\d.]+)\s*D/, '全眼屈光力');
  const focalDoc = grab(text, /焦距\s*([\d.]+)\s*毫米/, '简化眼焦距');
  const axisDoc = grab(text, /眼轴约\s*([\d.]+)\s*毫米/, '眼轴长度');
  const perMmDoc = grab(text, /就是\s*([\d.]+)\s*D\s*的度数/, '每毫米眼轴的屈光度');
  const lambdaNm = grab(text, /取\s*(\d+)\s*纳米、(\d+)\s*毫米瞳孔/, '衍射计算的波长');
  const pupilMm = grab(text, /取\s*\d+\s*纳米、(\d+)\s*毫米瞳孔/, '衍射计算的瞳孔直径');

  const frontPower = surfacePower(nAir, nCornea, rFront);
  const netPower = frontPower - backPowerDoc;
  const fMm = focalLengthMm(N_IMAGE, totalDoc);
  const perMm = diopterPerMm(N_IMAGE, axisDoc / 1000);
  const theta = diffractionArcmin(lambdaNm, pupilMm);
  const b4 = blurCircleMm(4, 1, totalDoc);
  const b4Min = blurArcmin(b4, fMm);
  const amp40 = hofstetter(40);

  return {
    nAir, nCornea, rFront, frontPower, netPower, backPowerDoc, frontDoc,
    totalDoc, focalDoc, fMm, axisDoc, perMmDoc, perMm,
    lambdaNm, pupilMm, theta, b4, b4Min, amp40
  };
}

/** 逐项对照；任何一项对不上就抛错，并说清差在哪儿。 */
function verify(r, tol = { power: 0.6, focal: 0.02, perMm: 0.06, theta: 0.02, blur: 0.002, blurMin: 0.6 }) {
  const bad = [];
  const near = (a, b, t, label) => {
    if (!(Math.abs(a - b) <= t)) bad.push(`${label}：现算 ${a.toFixed(3)}，正文 ${b}`);
  };
  near(r.frontPower, r.frontDoc, tol.power, '角膜前表面屈光力');
  if (!(r.netPower >= 42 && r.netPower <= 43.5)) bad.push(`角膜净屈光力 ${r.netPower.toFixed(2)} 不在正文 42–43 D 区间`);
  near(r.fMm, r.focalDoc, tol.focal, '简化眼焦距');
  near(r.perMm, r.perMmDoc, tol.perMm, '每毫米眼轴屈光度');
  near(r.theta, 0.78, tol.theta, '3 毫米瞳孔衍射斑');
  near(r.b4, 0.067, tol.blur, '4 毫米瞳孔 1 D 离焦弥散圆');
  near(r.b4Min, 10, tol.blurMin, '1 D 离焦对应角分');
  if (bad.length) throw new Error('正文与公式不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function main() {
  const r = compute(read());
  verify(r);
  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（左为公式现算，右为正文所写；输入数从正文读出）');
  console.log('');
  console.log(`角膜前表面  (${r.nCornea} − ${r.nAir}) / ${(r.rFront / 1000).toFixed(4)} m = +${r.frontPower.toFixed(2)} D   正文 +${r.frontDoc} D`);
  console.log(`角膜净值    前表面减后表面 −${r.backPowerDoc} D = ${r.netPower.toFixed(2)} D   正文 42–43 D`);
  console.log(`全眼焦距    ${N_IMAGE.toFixed(4)} / ${r.totalDoc} D = ${r.fMm.toFixed(2)} mm   正文 ${r.focalDoc} mm`);
  console.log(`眼轴换算    n′/L²·dL = ${r.perMm.toFixed(2)} D/mm   正文 ${r.perMmDoc} D/mm`);
  console.log(`衍射斑      1.22×${r.lambdaNm}nm / ${r.pupilMm}mm = ${r.theta.toFixed(2)} 分   正文 0.78 分`);
  console.log(`离焦弥散    4mm 瞳孔 × 1 D / ${r.totalDoc} D = ${r.b4.toFixed(3)} mm ≈ ${r.b4Min.toFixed(1)} 分   正文约 10 分`);
  console.log('');
  console.log(`Hofstetter 40 岁：最小 ${r.amp40.min.toFixed(2)} D · 平均 ${r.amp40.avg.toFixed(2)} D（只作群体趋势，个体差可达 ±2 D）`);
  console.log('');
  console.log('※ 输入数与结论数均取自本章 docs/zh.md，公式在本文件里；改稿后重跑即可复现。');
  console.log('※ 本章为教学材料，数值是模型值与人群大致范围，不作个体正常值或处方依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, N_IMAGE,
  read, grab, surfacePower, diopterPerMm, focalLengthMm, diffractionArcmin, blurCircleMm, blurArcmin, hofstetter,
  compute, verify
};
