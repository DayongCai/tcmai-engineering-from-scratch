#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 6 章 儿童屈光与弱视：同一个度数，在六岁与十二岁不是一件事
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/06-e46/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法：把正文给的两组端点（新生儿与成年眼轴）算成增长速度与年折光度，
 * 再用调节幅度算「为什么同一个 +3.00 D 能被藏起来」；顺带核对正文说的
 * 「六条红线」在文里是否真的列了六条、散瞳记录是否真的是三项。
 * 这些都是从正文取数、由公式得出，再与文字对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '儿童屈光与弱视：同一个度数，在六岁与十二岁不是一件事';
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

/** 眼轴增长折算：ΔF ≈ (n′/L²)·dL，L 取 0.024 米。 */
function diopterPerMm(axisM = 0.024, nImage = N_IMAGE) {
  return (nImage / (axisM * axisM)) * 0.001;
}

/** 一段增长摊到若干年：返回每年毫米数。 */
function growthPerYear(growthMm, years) {
  if (!(years > 0)) throw new Error('年数必须为正');
  return growthMm / years;
}

/** 调节能否把某个远视度藏起来：返回剩余调节余量（D）。 */
function maskingMargin(amplitude, hyperopia) {
  return amplitude - hyperopia;
}

function compute(text) {
  const nbLow = grab(text, /新生儿眼轴\s*([\d.]+)[–-][\d.]+\s*毫米/, '新生儿眼轴下限');
  const nbHigh = grab(text, /新生儿眼轴\s*[\d.]+[–-]([\d.]+)\s*毫米/, '新生儿眼轴上限');
  const adultLow = grab(text, /成年\s*([\d.]+)[–-][\d.]+/, '成年眼轴下限');
  const adultHigh = grab(text, /成年\s*[\d.]+[–-]([\d.]+)/, '成年眼轴上限');
  const spanYears = grab(text, /分摊在十几年里，平均每年不到\s*([\d.]+)\s*毫米/, '年均增长上限（毫米）');
  const childAmp = grab(text, /六岁孩子的调节幅度可达\s*([\d.]+)\s*D/, '六岁调节幅度');
  const hyperDoc = grab(text, /足以把\s*\+([\d.]+)\s*D 的远视完全藏起来/, '被藏起来的远视度数');

  const growth = [adultLow - nbHigh, adultHigh - nbLow]; // 6.5 – 7.5 毫米
  const perMm = diopterPerMm();
  const midYears = 15; // 「十几年」取中位年数，正文只给量级
  const midGrowth = (growth[0] + growth[1]) / 2;
  const rateMid = growthPerYear(midGrowth, midYears);
  const rateSlow = growthPerYear(growth[0], 16);
  const rateFast = growthPerYear(growth[1], 12);
  const redLines = (text.match(/\*\*[一二三四五六七八九十]、\*\*/g) || []).length;
  const recordSentence = (text.match(/还有三项要记：([^。]+)。/) || [])[1] || '';
  const records = recordSentence.split('、').map((s) => s.trim()).filter(Boolean);

  return {
    nbLow, nbHigh, adultLow, adultHigh, growth, perMm, midYears, midGrowth,
    rateMid, rateSlow, rateFast, spanYears, childAmp, hyperDoc,
    marginChild: maskingMargin(childAmp, hyperDoc),
    exhaustsAmp: childAmp,
    redLines, records
  };
}

function verify(r, tol = { rate: 0.02, margin: 0.01 }) {
  const bad = [];
  if (!(r.growth[0] > 6 && r.growth[1] < 8)) bad.push(`轴长增长 ${r.growth.join('–')} 毫米，与正文的 7 毫米不符`);
  if (!(r.rateMid < r.spanYears)) bad.push(`中位年增长 ${r.rateMid.toFixed(3)} 毫米，正文称不到 ${r.spanYears}`);
  if (!(r.rateSlow < r.spanYears)) bad.push(`下限组合 ${r.rateSlow.toFixed(3)} 毫米/年，仍应低于 ${r.spanYears}`);
  if (!(r.rateMid * r.perMm > 0.9 && r.rateMid * r.perMm < 1.2)) {
    bad.push(`年折光度 ${(r.rateMid * r.perMm).toFixed(2)} D，正文称约 1 D`);
  }
  if (!(r.marginChild > 0)) bad.push(`+${r.hyperDoc} D 未被 ${r.childAmp} D 的幅度覆盖：余量 ${r.marginChild} D`);
  if (!(r.marginChild > 8)) bad.push(`余量 ${r.marginChild} D，藏不住的说法不成立`);
  if (!(r.redLines === 6)) bad.push(`正文实际列了 ${r.redLines} 条红线，与「六条」不符`);
  if (!(r.records.length === 3)) bad.push(`散瞳记录解析出 ${r.records.length} 项：${r.records.join('、')}`);
  if (bad.length) throw new Error('正文与计算不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function main() {
  const r = compute(read());
  verify(r);
  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（左为现算，右为正文所写；端点与系数从正文读出）');
  console.log('');
  console.log(`眼轴区间  新生儿 ${r.nbLow.toFixed(1)}–${r.nbHigh.toFixed(1)} 毫米 → 成年 ${r.adultLow.toFixed(1)}–${r.adultHigh.toFixed(1)} 毫米`);
  console.log(`          增长 ${r.growth[0].toFixed(1)}–${r.growth[1].toFixed(1)} 毫米（正文写「约 7 毫米」）`);
  console.log(`年增长    按 ${r.midYears} 年摊：${r.rateMid.toFixed(3)} 毫米/年（正文称不到 ${r.spanYears} 毫米）`);
  console.log(`          区间 ${r.rateSlow.toFixed(3)}–${r.rateFast.toFixed(3)} 毫米/年（取决于起点、终点与年数）`);
  console.log(`年折光    ${r.rateMid.toFixed(3)} 毫米/年 × ${r.perMm.toFixed(2)} D/mm = ${(r.rateMid * r.perMm).toFixed(2)} D/年（正文称约 1 D）`);
  console.log('');
  console.log(`调节与远视  +${r.hyperDoc} D 的远视能否被藏起：`);
  console.log(`  六岁幅度 ${r.childAmp} D → 余量 ${r.marginChild} D，藏得住；要耗掉全部幅度需 ${r.exhaustsAmp} D 的远视`);
  console.log('  （这也是儿童必须散瞳的量化理由：幅度远大于常见远视度数）');
  console.log('');
  console.log(`散瞳记录三项：${r.records.join('、')}（缺一项，两次验光就不可比）`);
  console.log(`转诊红线：正文实列 ${r.redLines} 条，与「六条红线」一致`);
  console.log('');
  console.log('※ 端点、系数与条文均取自本章 docs/zh.md；本章不给处方模板、治疗剂量与随访数值。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, grab, diopterPerMm, growthPerYear, maskingMargin, compute, verify
};
