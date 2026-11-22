#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 2 章 屈光不正的类型：先问「哪条路径」，再问「多少度」
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/02-e42/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法：从正文读出两组真人参数（眼轴、角膜屈光力）与两个系数（每毫米眼轴折几度、
 * 每 1 D 参差带多少不等像），把「度数相近、路径不同」算出来，再与正文的结论数对照。
 * 顺带把「多少 D 参差会撞上不等像的融合上限」算成可检验的区间。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '屈光不正的类型：先问「哪条路径」，再问「多少度」';
const N_IMAGE = 4 / 3;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  return Number(String(m[1]).replace(/[−–—]/g, '-').replace(/[^\d.\-]/g, ''));
}

/** 眼轴差折成屈光度：ΔF ≈ (n′/L²)·dL，L 用 24 毫米（正文所取）。 */
function axisToDiopter(deltaMm, axisM = 0.024, nImage = N_IMAGE) {
  return ((nImage / (axisM * axisM)) * (deltaMm / 1000));
}

/** 两眼的轴性差与曲率差相加，得到「净失配」。轴长增 → 近视；角膜变陡 → 近视。 */
function netMismatch({ axisA, axisB, corneaA, corneaB }, perMmD) {
  const axisPart = (axisA - axisB) * perMmD; // 轴长者偏近视，取正
  const corneaPart = corneaA - corneaB; // 角膜屈光力高者偏近视，取正
  return { axisPart, corneaPart, net: axisPart + corneaPart };
}

/** 不等像：每 1 D 参差约带 p% 的像大小差；返回给定参差下的百分比。 */
function aniseikoniaPercent(diopters, percentPerD) {
  return diopters * percentPerD;
}

/** 撞上融合上限（默认 5%）所需的参差度数区间。 */
function fusionLimitRange(limitPercent, [lowPerD, highPerD]) {
  return [limitPercent / highPerD, limitPercent / lowPerD].sort((a, b) => a - b);
}

function compute(text) {
  const perMmDoc = grab(text, /1 毫米眼轴约折\s*([\d.]+)\s*D/, '每毫米眼轴的屈光度');
  const axisA = grab(text, /一位眼轴\s*([\d.]+)\s*毫米、角膜\s*\d+\s*D/, '第一位患者的眼轴');
  const corneaA = grab(text, /一位眼轴\s*[\d.]+\s*毫米、角膜\s*(\d+)\s*D/, '第一位患者的角膜屈光力');
  const axisB = grab(text, /一位眼轴\s*[\d.]+\s*毫米、角膜\s*\d+\s*D，一位眼轴\s*([\d.]+)\s*毫米/, '第二位患者的眼轴');
  const corneaB = grab(text, /一位眼轴\s*[\d.]+\s*毫米、角膜\s*\d+\s*D，一位眼轴\s*[\d.]+\s*毫米、角膜\s*(\d+)\s*D/, '第二位患者的角膜屈光力');
  const pairDiffDoc = grab(text, /两毫米的轴长差约合\s*([\d.]+)\s*D/, '两毫米轴长差折合度数');
  const anisoLow = grab(text, /每 1 D 参差约带\s*([\d.]+)%/, '不等像下限系数');
  const anisoHigh = grab(text, /每 1 D 参差约带\s*[\d.]+%[–-]([\d.]+)%/, '不等像上限系数');
  const fusionLimit = grab(text, /超过约\s*(\d+)%\s*时多数人难以融合/, '融合上限百分比');
  const highAxis = grab(text, /常引\s*([\d.]+)\s*毫米作参考/, '高度近视的眼轴参考值');

  const perMm = axisToDiopter(1);
  const first = netMismatch({ axisA, axisB, corneaA, corneaB }, perMm);
  const diffMm = Math.abs(axisA - axisB);
  const pairAxisD = axisToDiopter(diffMm);
  // 正文第二组：眼轴 25.5/41 D 与 23.7/46 D
  const pair2 = {
    axisA: grab(text, /眼轴\s*([\d.]+)\s*毫米而角膜\s*41\s*D/, '第二组第一位眼轴'),
    axisB: grab(text, /眼轴\s*[\d.]+\s*毫米而角膜\s*41\s*D 的人，与眼轴\s*([\d.]+)\s*毫米/, '第二组第二位眼轴'),
    corneaA: 41, corneaB: 46
  };
  const second = netMismatch(pair2, perMm);
  const limit = fusionLimitRange(fusionLimit, [anisoLow, anisoHigh]);

  return {
    perMmDoc, perMm, axisA, axisB, corneaA, corneaB, first, diffMm, pairAxisD, pairDiffDoc,
    anisoLow, anisoHigh, fusionLimit, limit, highAxis, second, pair2
  };
}

function verify(r, tol = { perMm: 0.06, pair: 0.1 }) {
  const bad = [];
  const near = (a, b, t, label) => {
    if (!(Math.abs(a - b) <= t)) bad.push(`${label}：现算 ${a.toFixed(3)}，正文 ${b}`);
  };
  near(r.perMm, r.perMmDoc, tol.perMm, '每毫米眼轴屈光度');
  near(r.pairAxisD, r.pairDiffDoc, tol.pair, '两毫米轴长差折合度数');
  // 轴性差被角膜差抵掉大半：净值应远小于轴性分项
  if (!(Math.abs(r.first.net) < Math.abs(r.first.axisPart) * 0.6)) {
    bad.push(`抵偿关系不成立：轴性 ${r.first.axisPart.toFixed(2)} D，净值 ${r.first.net.toFixed(2)} D`);
  }
  if (!(Math.abs(r.second.net) < 1)) bad.push(`第二组净失配 ${r.second.net.toFixed(2)} D，不在「相近度数」量级`);
  if (!(r.limit[0] < r.limit[1])) bad.push('融合上限区间反了');
  if (bad.length) throw new Error('正文与计算不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function main() {
  const r = compute(read());
  verify(r);
  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（左为现算，右为正文所写；输入参数从正文读出）');
  console.log('');
  console.log(`每毫米眼轴  n′/L²·dL = ${r.perMm.toFixed(2)} D/mm   正文 ${r.perMmDoc} D/mm`);
  console.log('');
  console.log(`第一组  眼轴 ${r.axisA} vs ${r.axisB} 毫米（差 ${r.diffMm.toFixed(1)} 毫米 → ${r.pairAxisD.toFixed(2)} D，正文 ${r.pairDiffDoc} D）`);
  console.log(`        角膜 ${r.corneaA} vs ${r.corneaB} D（差 −${Math.abs(r.first.corneaPart).toFixed(2)} D，方向相反）`);
  console.log(`        净失配 ${r.first.net.toFixed(2)} D —— 三 D 的角膜差把四 D 多的大半抵掉了`);
  console.log('');
  console.log(`第二组  眼轴 ${r.pair2.axisA} vs ${r.pair2.axisB} 毫米、角膜 41 vs 46 D → 净失配 ${r.second.net.toFixed(2)} D，落在同一档`);
  console.log('');
  console.log(`不等像  每 1 D 参差 ${r.anisoLow}%–${r.anisoHigh}%；撞上 ${r.fusionLimit}% 融合上限需 ${r.limit[0].toFixed(2)}–${r.limit[1].toFixed(2)} D 参差`);
  console.log(`高度近视  眼轴参考值 ${r.highAxis} 毫米（度数只作筛查入口，风险看眼轴与眼底）`);
  console.log('');
  console.log('※ 输入与结论数均取自本章 docs/zh.md；路径（轴性/屈光性）决定随访什么，度数只决定配多少。');
  console.log('※ 本章为教学材料，分级与阈值只作分类边界，不构成对任何个体的诊断标准。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, grab, axisToDiopter, netMismatch, aniseikoniaPercent, fusionLimitRange,
  compute, verify
};
