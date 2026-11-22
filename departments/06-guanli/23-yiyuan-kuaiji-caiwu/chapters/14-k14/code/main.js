#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 14 章 整改率 61.6%
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/14-k14/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的整改率、重复率与抽样区间都可复算：53/86、780/1,240、35/86，
 * 9/120 的差错率与 95% 置信区间（二项分布正态近似）。脚本重算并逐项对账。
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
  const found = doc.match(/查出问题\s*(\d+)\s*项、涉及金额\s*([\d,]+)\s*万元/);
  if (!found) throw new Error('正文里找不到查出问题');
  const fixed = doc.match(/完成整改\s*(\d+)\s*项、金额\s*([\d,]+)\s*万元，\*\*按项\s*([\d.]+)%、按金额\s*([\d.]+)%\*\*/);
  if (!fixed) throw new Error('正文里找不到整改结果');
  const repeat = doc.match(/(\d+)\s*项里有\s*(\d+)\s*项是上年度已经提过的同类问题，\*\*重复率\s*([\d.]+)%\*\*/);
  if (!repeat) throw new Error('正文里找不到重复问题');
  const sample = doc.match(/年付款\s*([\d,]+)\s*笔、金额\s*([\d,]+)\s*万元，抽\s*(\d+)\s*笔核对，发现差错\s*(\d+)\s*笔，差错率\s*([\d.]+)%/);
  if (!sample) throw new Error('正文里找不到抽样');
  const ci = doc.match(/标准误 = √\(([\d.]+) × ([\d.]+) ÷ (\d+)\) = ([\d.]+)，95% 置信区间为\s*([\d.]+)% ± ([\d.]+) 个百分点，即\s*\*\*([\d.]+)% 到 ([\d.]+)%\*\*。折算成金额是\s*\*\*([\d,]+)\s*万元到 ([\d,]+)\s*万元\*\*/);
  if (!ci) throw new Error('正文里找不到抽样区间');
  return {
    auditors: num(/内部审计\s*(\d+)\s*人/, '审计人数'),
    projects: num(/一年做\s*(\d+)\s*个项目/, '项目数'),
    issues: Number(found[1]),
    issueAmount: Number(found[2].replace(/,/g, '')),
    fixed: Number(fixed[1]),
    fixedAmount: Number(fixed[2].replace(/,/g, '')),
    fixedRate: Number(fixed[3]),
    fixedAmountRate: Number(fixed[4]),
    repeatBase: Number(repeat[1]),
    repeatCount: Number(repeat[2]),
    repeatRate: Number(repeat[3]),
    payments: Number(sample[1].replace(/,/g, '')),
    payAmount: Number(sample[2].replace(/,/g, '')),
    sampleSize: Number(sample[3]),
    errors: Number(sample[4]),
    errorRate: Number(sample[5]),
    seStated: Number(ci[4]),
    ciPoints: Number(ci[6]),
    lowPct: Number(ci[7]),
    highPct: Number(ci[8]),
    lowAmount: Number(ci[9].replace(/,/g, '')),
    highAmount: Number(ci[10].replace(/,/g, '')),
  };
}

function compute(p) {
  const rate = (p.errors / p.sampleSize) * 100;
  const se = Math.sqrt((p.errors / p.sampleSize) * (1 - p.errors / p.sampleSize) / p.sampleSize);
  const half = 1.96 * se * 100;
  const lowPct = Math.round((rate - half) * 10) / 10;
  const highPct = Math.round((rate + half) * 10) / 10;
  const point = (p.payAmount * rate) / 100;
  return {
    fixedRate: (p.fixed / p.issues) * 100,
    fixedAmountRate: (p.fixedAmount / p.issueAmount) * 100,
    repeatRate: (p.repeatCount / p.repeatBase) * 100,
    rate,
    se,
    half,
    lowPct,
    highPct,
    point,
    lowAmount: (p.payAmount * lowPct) / 100,
    highAmount: (p.payAmount * highPct) / 100,
    widthRatio: ((p.payAmount * highPct) / 100 - (p.payAmount * lowPct) / 100) / point,
  };
}

const wan = (n) => Math.round(n).toLocaleString('en-US');

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(Math.abs(r.fixedRate - p.fixedRate) < 0.06 && p.fixedRate === 61.6, '按项整改率 53 ÷ 86 = 61.6%');
  expect(Math.abs(r.fixedAmountRate - p.fixedAmountRate) < 0.06 && p.fixedAmountRate === 62.9, '按金额整改率 780 ÷ 1,240 = 62.9%');
  expect(Math.abs(r.repeatRate - p.repeatRate) < 0.06 && p.repeatRate === 40.7, '重复率 35 ÷ 86 = 40.7%');
  expect(Math.abs(r.rate - p.errorRate) < 1e-9 && p.errorRate === 7.5, '抽样差错率 9 ÷ 120 = 7.5%');
  expect(Math.round(r.point) === 1395 && doc.includes('**1,395 万元**'), '点估计 18,600 × 7.5% = 1,395 万元');
  expect(Math.abs(r.se - p.seStated) < 0.001 && p.seStated === 0.024, '标准误 0.024');
  expect(Math.abs(r.half - p.ciPoints) < 0.1 && p.ciPoints === 4.7, '95% 区间 ±4.7 个百分点');
  expect(Math.abs(r.lowPct - p.lowPct) < 0.11 && Math.abs(r.highPct - p.highPct) < 0.11, '区间 2.8% 到 12.2%');
  expect(Math.abs(r.lowAmount - p.lowAmount) < 1.5 && Math.abs(r.highAmount - p.highAmount) < 1.5, '金额区间 521 到 2,269 万元');
  expect(Math.abs(r.widthRatio - 1.25) < 0.01 && doc.includes('1.25 倍'), '区间宽度约为点估计的 1.25 倍');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 14 章 整改率 61.6%');
  console.log('');
  console.log(`审计 ${p.auditors} 人、${p.projects} 个项目：查出 ${p.issues} 项、${wan(p.issueAmount)} 万元`);
  console.log(`整改 ${p.fixed} 项、${wan(p.fixedAmount)} 万元 → 按项 ${r.fixedRate.toFixed(1)}%，按金额 ${r.fixedAmountRate.toFixed(1)}%`);
  console.log(`重复问题 ${p.repeatCount} ÷ ${p.repeatBase} = ${r.repeatRate.toFixed(1)}%`);
  console.log('');
  console.log(`抽样：${wan(p.payments)} 笔 / ${wan(p.payAmount)} 万元，抽 ${p.sampleSize} 笔、差错 ${p.errors} 笔 → ${r.rate.toFixed(1)}%`);
  console.log(`  点估计 ${wan(p.payAmount)} × ${r.rate.toFixed(1)}% = ${wan(r.point)} 万元`);
  console.log(`  标准误 √(${(r.rate / 100).toFixed(3)} × ${(1 - r.rate / 100).toFixed(3)} ÷ ${p.sampleSize}) = ${r.se.toFixed(3)}`);
  console.log(`  95% 区间 ${r.lowPct}% — ${r.highPct}%，折合 ${wan(r.lowAmount)} — ${wan(r.highAmount)} 万元`);
  console.log(`  区间宽度是点估计的 ${r.widthRatio.toFixed(2)} 倍`);
  console.log('结论：整改率必须与重复率一起看；抽样结论不能被当作精确金额。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 整改率与抽样区间由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成审计结论或责任认定。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
