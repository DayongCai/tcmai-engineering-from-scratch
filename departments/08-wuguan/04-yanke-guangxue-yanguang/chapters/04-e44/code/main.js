#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 4 章 验光原理：三个度数都是真的，只有一个是基准
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/04-e44/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法：把两个「看不见的误差源」算出来——
 *   1) 检影的工作距离：1/d 就是给被检眼加上的人工屈光度；
 *   2) 镜眼距：F₂ = F₁/(1 − d·F₁)，同一片镜片换个距离，有效度数就不同。
 * 输入数（距离、度数）从正文读出，结论数（0.3 D、2.00 D、1.50 D）与正文对照。
 * 再算一个正文只用文字说的判据：度数到多少，2 毫米的距离差才够一格试片。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '验光原理：三个度数都是真的，只有一个是基准';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  return Number(String(m[1]).replace(/[−–—]/g, '-').replace(/[^\d.\-]/g, ''));
}

/* ---------- 顶点距离与工作距离：只留公式 ---------- */

/** 顶点距离换算：F₂ = F₁/(1 − d·F₁)，d 用毫米。 */
function effectivePower(F1, dMm) {
  const d = dMm / 1000;
  const denom = 1 - d * F1;
  if (Math.abs(denom) < 1e-9) throw new Error('顶点距离落在 F₁ 的极点上');
  return F1 / denom;
}

/** 同一片镜片在两个顶点距离上的有效度数差（取绝对值，单位 D）。 */
function powerShift(F1, d1Mm, d2Mm) {
  return Math.abs(effectivePower(F1, d1Mm) - effectivePower(F1, d2Mm));
}

/** 检影工作距离对应的人工屈光度：1/d（d 用米）。 */
function workingDistancePower(dMeters) {
  if (!(dMeters > 0)) throw new Error('工作距离必须为正');
  return 1 / dMeters;
}

/**
 * 度数多大时，从基准顶点距离挪动才够一格试片（默认 0.25 D）。
 * 用二分搜索求最小位移；返回毫米。这就是「低度数可以忽略、高度数必须换算」的量化版。
 */
function shiftForStep(F1, step = 0.25, baseMm = 12, limitMm = 40) {
  const target = Math.abs(effectivePower(F1, baseMm)) - step;
  let lo = baseMm;
  let hi = limitMm;
  if (Math.abs(effectivePower(F1, hi)) > target) return hi; // 到上限也不够一格
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (Math.abs(effectivePower(F1, mid)) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2 - baseMm;
}

function compute(text) {
  const refDist = grab(text, /(\d+)\s*厘米工作距离检影/, '检影工作距离（厘米）');
  const refPowerDoc = grab(text, /50 厘米相当于给被检眼加了 \+([\d.]+)\s*D/, '50 厘米的人工屈光度');
  const refDist2 = grab(text, /(\d+)\s*厘米扣\s*[\d.]+\s*D/, '第二个检影工作距离');
  const refPower2Doc = grab(text, /67 厘米扣\s*([\d.]+)\s*D/, '67 厘米应扣的度数');
  const highPower = grab(text, /一副\s*[−-]([\d.]+)\s*D 的镜片/, '例子里的高度近视度数');
  const dFrom = grab(text, /顶点距离从\s*(\d+)\s*毫米变到\s*\d+\s*毫米/, '原顶点距离');
  const dTo = grab(text, /顶点距离从\s*\d+\s*毫米变到\s*(\d+)\s*毫米/, '新顶点距离');
  const shiftDoc = grab(text, /有效度数差约\s*([\d.]+)\s*D/, '顶点距离造成的有效度数差');
  const convFrom = grab(text, /屈光度超过约\s*±([\d.]+)\s*D 时换算成为必要/, '换算成为必要的度数');
  const mainErr = grab(text, /超过\s*±([\d.]+)\s*D 时，顶点距离的误差/, '顶点距离成为主要误差源的度数');

  const F1 = -highPower;
  const wd1 = workingDistancePower(refDist / 100);
  const wd2 = workingDistancePower(refDist2 / 100);
  const shift = powerShift(F1, dFrom, dTo);
  const shiftAt = (p) => powerShift(-p, dFrom, dTo);
  const steps = { at4: shiftForStep(-convFrom), at10: shiftForStep(-mainErr), at15: shiftForStep(F1) };

  return {
    refDist, wd1, refPowerDoc, refDist2, wd2, refPower2Doc,
    highPower, F1, dFrom, dTo, shiftDoc, shift, convFrom, mainErr, steps, shiftAt
  };
}

function verify(r, tol = { wd: 0.02, shift: 0.03 }) {
  const bad = [];
  const near = (a, b, t, label) => {
    if (!(Math.abs(a - b) <= t)) bad.push(`${label}：现算 ${a.toFixed(3)}，正文 ${b}`);
  };
  near(r.wd1, r.refPowerDoc, tol.wd, '50 厘米工作距离屈光度');
  near(r.wd2, r.refPower2Doc, tol.wd, '67 厘米工作距离屈光度');
  near(r.shift, r.shiftDoc, tol.shift, '顶点距离造成的有效度数差');
  if (!(Math.abs(r.shiftAt(r.convFrom)) < 0.05)) {
    bad.push(`±${r.convFrom} D 时 2 毫米距离差应为 ${r.shiftAt(r.convFrom).toFixed(3)} D，正文说此时换算「成为必要」`);
  }
  if (!(r.steps.at15 < r.steps.at10 && r.steps.at10 < r.steps.at4)) {
    bad.push('度数越高，够一格的位移应越短');
  }
  if (!(r.steps.at4 > 10)) bad.push(`±${r.convFrom} D 挪 2 毫米远不够一格，现算需 ${r.steps.at4.toFixed(1)} 毫米`);
  if (bad.length) throw new Error('正文与计算不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function fmtF(x) {
  return (x < 0 ? '−' : '') + Math.abs(x).toFixed(2);
}

function main() {
  const r = compute(read());
  verify(r);
  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（左为现算，右为正文所写；输入数从正文读出）');
  console.log('');
  console.log(`检影工作距离  ${r.refDist} cm → 1/0.${r.refDist} = +${r.wd1.toFixed(2)} D   正文 +${r.refPowerDoc} D（忘扣则结果偏负）`);
  console.log(`              ${r.refDist2} cm → 1/${(r.refDist2 / 100).toFixed(2)} = +${r.wd2.toFixed(2)} D   正文 ${r.refPower2Doc} D`);
  console.log('');
  console.log(`顶点距离      F₂ = F₁/(1 − d·F₁)：${fmtF(r.F1)} D 在 ${r.dFrom} mm 处为 ${fmtF(effectivePower(r.F1, r.dFrom))} D，`);
  console.log(`              在 ${r.dTo} mm 处为 ${fmtF(effectivePower(r.F1, r.dTo))} D，差 ${r.shift.toFixed(2)} D   正文约 ${r.shiftDoc} D`);
  console.log(`              近视镜片离眼越远，有效度数越低；远视镜片相反`);
  console.log('');
  console.log('挪多远才够一格试片（0.25 D，从 12 毫米起算）：');
  for (const [k, label] of [['at4', `±${r.convFrom}.00 D`], ['at10', `±${r.mainErr}.00 D`], ['at15', `${fmtF(r.F1)} D`]]) {
    console.log(`  ${label.padEnd(9)} 需挪 ${r.steps[k].toFixed(1)} mm → 2 毫米的距离差在该度数上${r.steps[k] > 5 ? '仍可忽略' : '已能差出半格'}`);
  }
  console.log('');
  console.log('三个度数：小瞳＝此刻的调节，散瞳＝静息态结构，主觉＝愿意接受多少；换算与优先级写在正文，不在这里给处方。');
  console.log('※ 输入与结论数均取自本章 docs/zh.md；本章不给剂量与处方模板，屈光度须由执业人员依现行规范决定。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, grab, effectivePower, powerShift, workingDistancePower, shiftForStep,
  compute, verify
};
