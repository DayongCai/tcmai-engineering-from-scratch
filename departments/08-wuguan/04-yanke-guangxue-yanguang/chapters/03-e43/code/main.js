#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 3 章 视力与对比敏感度：1.0 测的是曲线的尾巴
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/03-e43/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法：把「1 分视角」这条约定从正文里读出来，用几何与对数算一遍：
 * 5 米处的线宽、1.0 对应的空间频率、四种记录的换算、距离与结点差造成的误差。
 * 再把算得的数与正文写的数逐个对照——对不上就报错，而不是把文字抄一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '视力与对比敏感度：1.0 测的是曲线的尾巴';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  return Number(String(m[1]).replace(/[−–—]/g, '-').replace(/[^\d.\-]/g, ''));
}

/* ---------- 视角与记录：只留公式 ---------- */

/** 距离 d 米处，角分 mar 对应多长（毫米）。1 分视角按 tan 精确算。 */
function arcminToMm(distanceM, mar) {
  return Math.tan((mar / 60) * (Math.PI / 180)) * distanceM * 1000;
}

/** 视力 = 1/MAR（分）。 */
function visionFromMAR(mar) {
  if (!(mar > 0)) throw new Error('MAR 必须为正: ' + mar);
  return 1 / mar;
}

/** logMAR = lg(1/小数)。 */
function logMAR(decimal) {
  if (!(decimal > 0)) throw new Error('小数视力必须为正: ' + decimal);
  return Math.log10(1 / decimal);
}

/** 5 分记录 = 5 − logMAR。 */
function fiveScale(decimal) {
  return 5 - logMAR(decimal);
}

/** 空间频率（周期/度）= 60 分 / 一个周期占的角分。 */
function cyclesPerDegree(arcminPerCycle) {
  return 60 / arcminPerCycle;
}

/** 某个距离上的调节需求（D）。 */
function accommodationDemand(distanceM) {
  return 1 / distanceM;
}

/** 结点与角膜顶点差 7 毫米，在给定距离上占多少比例。 */
function nodalGapFraction(distanceMm, gapMm = 7) {
  return gapMm / distanceMm;
}

function compute(text) {
  const lineMmDoc = grab(text, /5×tan\(1\/60°\)\s*≈\s*([\d.]+)\s*毫米/, '1 分视角在 5 米处的线宽');
  const cpdDoc = grab(text, /视力 1\.0 对应约\s*([\d.]+)\s*cpd/, '1.0 对应的空间频率');
  const peakLow = grab(text, /峰值在\s*(\d+)[–-]\d+\s*cpd/, 'CSF 峰值下限');
  const peakHigh = grab(text, /峰值在\s*\d+[–-](\d+)\s*cpd/, 'CSF 峰值上限');
  const cutLow = grab(text, /截止频率约\s*(\d+)[–-]\d+\s*cpd/, '截止频率下限');
  const cutHigh = grab(text, /截止频率约\s*\d+[–-](\d+)\s*cpd/, '截止频率上限');
  const brightDoc = grab(text, /表面亮度在\s*(\d+)\s*cd\/m²/, '标准表面亮度');
  const contrastDoc = grab(text, /对比度不低于\s*(\d+)%/, '标称对比度');
  const demandDoc = grab(text, /它的调节需求只有\s*([\d.]+)\s*D/, '5 米处的调节需求');
  const noiseDoc = grab(text, /重复测量约\s*±([\d.]+)\s*log/, '重复测量变异度');
  const meanDecimal = grab(text, /算术平均得\s*([\d.]+)/, '两个小数的算术平均');
  const meanLogDoc = grab(text, /在 logMAR 上对应\s*([\d.]+)/, '平均小数对应的 logMAR');

  const oneLineAt5m = arcminToMm(5, 1);
  const oneLineCpd = cyclesPerDegree(2); // 分辨两点要占 2 分才成一个周期
  const marFor10 = visionFromMAR(0.1);
  const lm = { d01: logMAR(0.1), d02: logMAR(0.2), d005: logMAR(0.05), d10: logMAR(1.0) };
  const five = { d01: fiveScale(0.1), d02: fiveScale(0.2), d005: fiveScale(0.05), d10: fiveScale(1.0) };
  const demand5m = accommodationDemand(5);
  const gapNear = nodalGapFraction(250);
  const gapFar = nodalGapFraction(5000);
  const meanLog = logMAR(meanDecimal);
  const noiseFactor = Math.pow(10, noiseDoc); // 0.1 log 对应 1.26 倍，约一行

  return {
    lineMmDoc, oneLineAt5m, cpdDoc, oneLineCpd, peakLow, peakHigh, cutLow, cutHigh,
    brightDoc, contrastDoc, demandDoc, demand5m, noiseDoc, noiseFactor, gapNear, gapFar,
    marFor10, lm, five, meanDecimal, meanLog, meanLogDoc
  };
}

function verify(r, tol = { mm: 0.01, cpd: 0.5, log: 0.01, five: 0.02, demand: 0.01 }) {
  const bad = [];
  const near = (a, b, t, label) => {
    if (!(Math.abs(a - b) <= t)) bad.push(`${label}：现算 ${a.toFixed(3)}，正文 ${b}`);
  };
  near(r.oneLineAt5m, r.lineMmDoc, tol.mm, '1 分视角线宽');
  near(r.oneLineCpd, r.cpdDoc, tol.cpd, '1.0 对应空间频率');
  near(r.demand5m, r.demandDoc, tol.demand, '5 米调节需求');
  near(r.meanLog, r.meanLogDoc, tol.log, '平均小数对应的 logMAR');
  if (!(r.peakLow < r.peakHigh && r.peakHigh < r.cutLow && r.cutLow < r.cutHigh)) {
    bad.push(`频率次序不对：峰值 ${r.peakLow}–${r.peakHigh}，截止 ${r.cutLow}–${r.cutHigh}`);
  }
  if (!(r.gapNear > 0.025 && r.gapNear < 0.035)) bad.push(`25 厘米处结点差应约 3%，现算 ${(r.gapNear * 100).toFixed(1)}%`);
  if (!(r.gapFar < 0.002)) bad.push(`5 米处结点差应可忽略，现算 ${(r.gapFar * 100).toFixed(3)}%`);
  if (bad.length) throw new Error('正文与计算不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function main() {
  const r = compute(read());
  verify(r);
  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（左为现算，右为正文所写；输入数从正文读出）');
  console.log('');
  console.log(`1 分视角 @5 m   5×tan(1/60°) = ${r.oneLineAt5m.toFixed(3)} mm   正文 ${r.lineMmDoc} mm`);
  console.log(`1.0 ↔ 频率      60 / 2 分 = ${r.oneLineCpd.toFixed(1)} cpd   正文 ${r.cpdDoc} cpd`);
  console.log(`CSF 峰值        ${r.peakLow}–${r.peakHigh} cpd · 截止 ${r.cutLow}–${r.cutHigh} cpd（1.0 落在末尾）`);
  console.log(`5 米调节需求    1/5 = ${r.demand5m.toFixed(2)} D   正文 ${r.demandDoc} D（落在焦深内，故可忽略）`);
  console.log('');
  console.log('四种记录换算：');
  console.log(`  小数 0.1 → logMAR ${r.lm.d01.toFixed(2)} → 五分 ${r.five.d01.toFixed(2)}`);
  console.log(`  小数 0.2 → logMAR ${r.lm.d02.toFixed(2)} → 五分 ${r.five.d02.toFixed(2)}`);
  console.log(`  小数 0.05 → logMAR ${r.lm.d005.toFixed(2)} → 五分 ${r.five.d005.toFixed(2)}`);
  console.log(`  小数 1.0 → logMAR ${r.lm.d10.toFixed(2)} → 五分 ${r.five.d10.toFixed(2)}`);
  console.log(`  0.1 与 0.2 取算术平均 ${r.meanDecimal} → logMAR ${r.meanLog.toFixed(2)}（正文 ${r.meanLogDoc}）：不是同一件事`);
  console.log('');
  console.log(`结点差 7 mm：25 cm 处 ${(r.gapNear * 100).toFixed(1)}%，5 m 处 ${(r.gapFar * 100).toFixed(3)}%`);
  console.log(`重复测量 ±${r.noiseDoc} log = ${r.noiseFactor.toFixed(2)} 倍，约一行；小于它的变化多数落在噪声里`);
  console.log(`测量条件：表面亮度 ${r.brightDoc} cd/m² 量级、对比度不低于 ${r.contrastDoc}%（照度合格≠对比度合格）`);
  console.log('');
  console.log('※ 输入与结论数均取自本章 docs/zh.md，公式在本文件里；改稿后重跑即可复现。');
  console.log('※ 亮度、距离与阈值只作测量条件说明，不构成操作规范；视力检查须由执业人员依现行标准执行。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, grab, arcminToMm, visionFromMAR, logMAR, fiveScale, cyclesPerDegree, accommodationDemand, nodalGapFraction,
  compute, verify
};
