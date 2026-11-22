#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 7 章 收入的确认与钱的到账
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/07-k7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的门诊／住院结构、核减率与核减后的结余都可复算：
 * 31,000 + 52,000 = 83,000；1,860 ÷ 54,000 = 3.44%；1,800 − 1,860 = −60。
 * 脚本从正文抓数重算，再与正文印出的占比与结果对账。
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
  return {
    revenue: num(/全年医疗收入\s*([\d,]+)\s*万元/, '全年医疗收入'),
    insurance: num(/其中医保结算部分\s*([\d,]+)\s*万元/, '医保结算部分'),
    cut: num(/年终清算时医保核减\s*([\d,]+)\s*万元/, '医保核减'),
    surplus: num(/各项费用 = ([\d,]+)\s*万元/, '核减前结余'),
    outpatient: num(/\|\s*门诊收入\s*\|\s*([\d,]+)\s*\|/, '门诊收入'),
    inpatient: num(/\|\s*住院收入\s*\|\s*([\d,]+)\s*\|/, '住院收入'),
    costTotal: num(/两个月的成本约\s*([\d,]+)\s*万元/, '两个月成本'),
  };
}

function compute(p) {
  const split = p.outpatient + p.inpatient;
  const cutRate = (p.cut / p.insurance) * 100;
  return {
    split,
    splitMatches: split === p.revenue,
    outShare: (p.outpatient / p.revenue) * 100,
    inShare: (p.inpatient / p.revenue) * 100,
    cutRate,
    afterCut: p.surplus - p.cut,
    twoMonthCost: p.costTotal,
    annualCost: p.costTotal * 6,
  };
}

const wan = (n) => n.toLocaleString('en-US');
const pct = (x) => `${x.toFixed(1)}%`;

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.splitMatches && doc.includes('| 合计 | 83,000 |'), '门诊 31,000 + 住院 52,000 = 83,000');
  expect(Math.abs(r.outShare - 37.3) < 0.05 && doc.includes('37.3%'), '门诊占 37.3%');
  expect(Math.abs(r.inShare - 62.7) < 0.05 && doc.includes('62.7%'), '住院占 62.7%');
  expect(Math.abs(r.cutRate - 3.44) < 0.005 && doc.includes('3.44%'), '核减率 1,860 ÷ 54,000 = 3.44%');
  expect(r.afterCut === -60 && doc.includes('1,800 − 1,860 = −60'), '核减后结余 −60 万元');
  const off = Math.abs(r.twoMonthCost - 13000) / 13000;
  expect(off < 0.01 && doc.includes('两个月的成本约 13,000 万元'), '两个月垫付成本 13,000 万元');
  expect(r.annualCost < p.revenue, `两个月成本折年 ${wan(r.annualCost)} 万元，未超过医疗收入`);
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 7 章 收入的确认与钱的到账');
  console.log('');
  console.log(`收入结构（万元）：门诊 ${wan(p.outpatient)}（${pct(r.outShare)}）+ 住院 ${wan(p.inpatient)}（${pct(r.inShare)}）= ${wan(r.split)}`);
  console.log(`医保结算部分 ${wan(p.insurance)}，年终清算核减 ${wan(p.cut)}`);
  console.log('');
  console.log(`核减率：${wan(p.cut)} ÷ ${wan(p.insurance)} = ${r.cutRate.toFixed(2)}%`);
  console.log(`核减后结余：${wan(p.surplus)} − ${wan(p.cut)} = ${wan(r.afterCut)}`);
  console.log(`两个月垫付成本：${wan(r.twoMonthCost)} 万元（折年 ${wan(r.annualCost)} 万元，医疗收入 ${wan(p.revenue)} 万元）`);
  console.log('结论：从盈余到亏损，只差一次清算；确认的收入不等于收得回的收入。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 占比与核减率由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成医保结算意见或收入管理建议。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
