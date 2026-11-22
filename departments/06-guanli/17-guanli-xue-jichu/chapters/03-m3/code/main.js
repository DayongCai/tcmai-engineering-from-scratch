#!/usr/bin/env node
/**
 * 管理学基础 · 第 3 章 原理用来排除错误做法，方法才用来动手
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/03-m3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 一次可复算的流程改进：从正文取出院例数、重采率的前后值、单次重采耗的护士工时，
 * 现算每月减少的重采例数、节约工时、折合护士工作日，并与正文自己给出的数对账。
 * 目的不是求一个漂亮结果，而是把「抓了一下流程」换成能进管理议程的单位。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '原理用来排除错误做法，方法才用来动手';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 正文第 5 行的机构画像与第 51 行的改进推演，全部现取。 */
function facts(text) {
  return {
    policies: grab(text, /有\s*(\d+)\s*个制度文件/, '68 个制度文件'),
    flows: grab(text, /(\d+)\s*项流程/, '214 项流程'),
    committees: grab(text, /(\d+)\s*个院级委员会/, '9 个院级委员会'),
    monthlyDischarges: grab(text, /月出院\s*(\d+)\s*例/, '260 例'),
    recheckBeforePct: grab(text, /标本重采率\s*(\d+)%/, '重采率 12%'),
    recheckAfterPct: grab(text, /把重采率降到\s*(\d+)%/, '降到 4%'),
    nurseMinutes: grab(text, /多耗护士工时\s*(\d+)\s*分钟/, '18 分钟'),
    shiftsPerMonth: grab(text, /等于\s*([\d.]+)\s*个护士工作日/, '0.78 个工作日'),
    shiftsPerYear: grab(text, /一年约\s*([\d.]+)\s*个工作日/, '9.4 个工作日'),
  };
}

/** 每月减少的重采例数 = 出院例数 ×（原重采率 − 目标重采率）。 */
function casesAvoided(monthly, beforePct, afterPct) {
  if (!(monthly > 0)) throw new Error('出院例数必须为正');
  if (beforePct < 0 || afterPct < 0 || afterPct > beforePct) throw new Error('重采率不合法');
  return monthly * ((beforePct - afterPct) / 100);
}

/** 每月节约的护士工时（分钟）。 */
const minutesSaved = (cases, minutes) => cases * minutes;

/** 折合护士工作日：按每班 8 小时。 */
const shiftsSaved = (minutes) => minutes / 60 / 8;

function main() {
  const text = read();
  const f = facts(text);
  const cases = casesAvoided(f.monthlyDischarges, f.recheckBeforePct, f.recheckAfterPct);
  const minutes = minutesSaved(cases, f.nurseMinutes);
  const shifts = shiftsSaved(minutes);
  const perYear = shifts * 12;

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、制度画像：${f.policies} 个制度文件 · ${f.flows} 项流程 · ${f.committees} 个院级委员会`);
  console.log('  → 制度不可谓不齐；同类差错反复，说明缺的不是文件数量，是判断相容性的那把尺。');
  console.log('');
  console.log(`二、可复算的改进：月出院 ${f.monthlyDischarges} 例，重采率 ${f.recheckBeforePct}% → ${f.recheckAfterPct}%`);
  console.log(`  每月减少重采 ${cases.toFixed(1)} 例`);
  console.log(`  每次多耗 ${f.nurseMinutes} 分钟 → 每月节约 ${minutes.toFixed(1)} 分钟 ≈ ${(minutes / 60).toFixed(2)} 小时`);
  console.log(`  折合 ${shifts.toFixed(2)} 个护士工作日/月，一年约 ${perYear.toFixed(1)} 个工作日`);
  console.log('  → 与正文给出的对账：' + `${f.shiftsPerMonth} / ${f.shiftsPerYear}` + ' 个工作日，差额 '
    + Math.abs(shifts - f.shiftsPerMonth).toFixed(2) + ' / ' + Math.abs(perYear - f.shiftsPerYear).toFixed(2));
  console.log('');
  console.log('三、方法选择的三个问题：失败模式是什么、这个方法会挤掉什么、成本落在谁身上');
  console.log('  → 数学方法不产生方案，它把方案变成可以排序的选项；进不了议程的改进等于没做。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；260 例、12%、4%、18 分钟为演算设定，不对应真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成管理咨询意见、质量控制方案或绩效设计依据。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  casesAvoided,
  minutesSaved,
  shiftsSaved,
};
