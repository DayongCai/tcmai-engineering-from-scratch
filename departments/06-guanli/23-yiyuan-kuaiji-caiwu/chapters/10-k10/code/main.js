#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 10 章 预算不是预测
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/10-k10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的增量法与零基法是一组六式闭合的算式：79,400 × 1.05、25,000 × 1.05、
 * 54,400 − 1,700、26,250 + 52,700、83,370 − 78,950、4,420 ÷ 83,370。
 * 脚本按成本性态重算两法，再与正文印出的差额、比率、进度差对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function parseParams(doc) {
  const num = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    return Number(m[1].replace(/,/g, ''));
  };
  const head = doc.match(/上年医疗收入\s*([\d,]+)\s*万元、医疗业务成本\s*([\d,]+)\s*万元、结余\s*([\d,]+)\s*万元/);
  if (!head) throw new Error('正文里找不到上年三项');
  const inc = doc.match(/支出预算\s*([\d,]+)\s*万元；收入端[^。]*只能报\s*([\d,]+)\s*万元/);
  if (!inc) throw new Error('正文里找不到增量法与收入上限');
  const bal = doc.match(/只剩\s*([\d,]+)\s*万元结余，结余率\s*([\d.]+)%/);
  if (!bal) throw new Error('正文里找不到增量法下的结余');
  const zero = doc.match(/零基重算，支出\s*([\d,]+)\s*万元，结余\s*([\d,]+)\s*万元/);
  if (!zero) throw new Error('正文里找不到零基法结果');
  const prog = doc.match(/按时间进度应执行\s*([\d.]+)%，即\s*([\d,]+)\s*万元；实际执行\s*([\d.]+)%，即\s*([\d,]+)\s*万元；差\s*([\d,]+)\s*万元/);
  if (!prog) throw new Error('正文里找不到执行进度三数');
  const cut = doc.match(/剔除重复维保合同\s*([\d,]+)、低效外送检验\s*([\d,]+)、会议差旅\s*([\d,]+)/);
  if (!cut) throw new Error('正文里找不到零基剔除项');
  return {
    revenue: Number(head[1].replace(/,/g, '')),
    cost: Number(head[2].replace(/,/g, '')),
    surplusBase: Number(head[3].replace(/,/g, '')),
    increment: Number(inc[1].replace(/,/g, '')),
    revenueCap: Number(inc[2].replace(/,/g, '')),
    surplusInc: Number(bal[1].replace(/,/g, '')),
    surplusRateInc: Number(bal[2]),
    zeroTotal: Number(zero[1].replace(/,/g, '')),
    surplusZero: Number(zero[2].replace(/,/g, '')),
    fixed: num(/\|\s*其中：固定成本\s*\|\s*([\d,]+)/, '固定成本'),
    variable: num(/\|\s*其中：变动成本\s*\|\s*([\d,]+)/, '变动成本'),
    zeroVar: num(/\|\s*零基法：变动 [\d,]+ × 1\.05\s*\|\s*([\d,]+)/, '零基变动成本'),
    zeroFixed: num(/\|\s*零基法：固定 [\d,]+ − [\d,]+\s*\|\s*([\d,]+)/, '零基固定成本'),
    cutA: Number(cut[1].replace(/,/g, '')),
    cutB: Number(cut[2].replace(/,/g, '')),
    cutC: Number(cut[3].replace(/,/g, '')),
    timeShare: Number(prog[1]),
    spentAtTime: Number(prog[2].replace(/,/g, '')),
    spentActualRate: Number(prog[3]),
    spentActual: Number(prog[4].replace(/,/g, '')),
    progressGap: Number(prog[5].replace(/,/g, '')),
    adjustAmount: num(/调整金额合计\s*([\d,]+)\s*万元/, '调整金额'),
    adjustRate: num(/调整金额合计\s*[\d,]+\s*万元，占支出预算的\s*([\d.]+)%/, '调整率'),
  };
}

function compute(p) {
  const cutSum = p.cutA + p.cutB + p.cutC;
  const incTotal = p.cost * 1.05;
  const zeroVar = p.variable * 1.05;
  const zeroFixed = p.fixed - cutSum;
  const zeroTotal = zeroVar + zeroFixed;
  return {
    cutSum,
    incTotal,
    zeroVar,
    zeroFixed,
    zeroTotal,
    diff: incTotal - zeroTotal,
    diffRate: ((incTotal - zeroTotal) / incTotal) * 100,
    fixedOver: p.fixed * 0.05,
    surplusInc: p.revenueCap - incTotal,
    surplusRateInc: ((p.revenueCap - incTotal) / p.revenueCap) * 100,
    surplusZero: p.revenueCap - zeroTotal,
    spentAtTime: p.increment * (p.timeShare / 100),
    progressGap: p.increment * (p.timeShare - p.spentActualRate) / 100,
    adjustRate: (p.adjustAmount / p.increment) * 100,
  };
}

const wan = (n) => Math.round(n).toLocaleString('en-US');

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(p.fixed + p.variable === p.cost, '固定 54,400 + 变动 25,000 = 上年成本 79,400');
  expect(Math.round(r.incTotal) === p.increment, '增量法 79,400 × 1.05 = 83,370');
  expect(Math.round(r.zeroVar) === p.zeroVar, '零基变动 25,000 × 1.05 = 26,250');
  expect(r.cutSum === 1700 && Math.round(r.zeroFixed) === p.zeroFixed, '零基固定 54,400 − 1,700 = 52,700');
  expect(Math.round(r.zeroTotal) === p.zeroTotal, '零基合计 26,250 + 52,700 = 78,950');
  expect(Math.round(r.diff) === 4420 && doc.includes('83,370 − 78,950 = 4,420'), '两法差额 4,420 万元');
  expect(Math.abs(r.diffRate - 5.3) < 0.05 && doc.includes('5.3%'), '差额占 5.3%');
  expect(Math.round(r.fixedOver) === 2720, '固定成本被多算 2,720 万元');
  expect(Math.round(r.surplusInc) === p.surplusInc && p.surplusInc === 630, '增量法结余 630 万元');
  expect(Math.abs(r.surplusRateInc - p.surplusRateInc) < 0.02 && p.surplusRateInc === 0.75, '增量法结余率 0.75%');
  expect(Math.round(r.surplusZero) === p.surplusZero && p.surplusZero === 5050, '零基法结余 5,050 万元');
  expect(Math.round(r.progressGap) === p.progressGap && p.progressGap === 5836, '进度差 5,836 万元');
  expect(Math.abs(r.adjustRate - p.adjustRate) < 0.05 && p.adjustRate === 10.7, '调整率 10.7%');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 10 章 预算不是预测');
  console.log('');
  console.log(`上年（万元）：收入 ${wan(p.revenue)}、成本 ${wan(p.cost)}（固定 ${wan(p.fixed)} / 变动 ${wan(p.variable)}）、结余 ${wan(p.surplusBase)}`);
  console.log('');
  console.log('两法对比（万元）：');
  console.log(`  增量法　${wan(p.cost)} × 1.05 = ${wan(r.incTotal)}`);
  console.log(`  零基法　变动 ${wan(r.zeroVar)} + 固定 ${wan(r.zeroFixed)}（剔除 ${wan(r.cutSum)}）= ${wan(r.zeroTotal)}`);
  console.log(`  差额　　${wan(r.incTotal)} − ${wan(r.zeroTotal)} = ${wan(r.diff)}（${r.diffRate.toFixed(1)}%）`);
  console.log('');
  console.log(`同报收入 ${wan(p.revenueCap)}：增量法结余 ${wan(r.surplusInc)}（${r.surplusRateInc.toFixed(2)}%），零基法结余 ${wan(r.surplusZero)}`);
  console.log(`固定成本被多乘 5%：${wan(p.fixed)} × 5% = ${wan(r.fixedOver)} 万元`);
  console.log('');
  console.log(`执行进度：时间 ${p.timeShare}% 应执行 ${wan(r.spentAtTime)}，实际 ${p.spentActualRate}% 即 ${wan(p.spentActual)}，差 ${wan(r.progressGap)} 万元`);
  console.log(`调整率：${wan(p.adjustAmount)} ÷ ${wan(p.increment)} = ${r.adjustRate.toFixed(1)}%`);
  console.log('结论：预算编平了，抗风险能力被编没了 —— 差的不是算术。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 两法差额与进度差由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成预算批复意见或资源配置方案。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
