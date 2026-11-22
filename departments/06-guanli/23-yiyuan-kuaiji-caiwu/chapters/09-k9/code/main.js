#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 9 章 多做不一定多赚
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/09-k9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的量本利算例互相闭合：边际贡献 4,200、保本量 3,500、3,200 例时 −126 万元；
 * 降耗材 600 元后保本量 3,063、结余 +66 万元；杠杆 23.3 倍。
 * 脚本从正文抓参数重算这些数，再与正文印出的结果对账。
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
  const pair = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    return [Number(m[1].replace(/,/g, '')), Number(m[2].replace(/,/g, ''))];
  };
  const [pay, variable] = pair(/DRG 支付标准\s*([\d,]+)\s*元，变动成本\s*([\d,]+)\s*元/, '支付标准与变动成本');
  const [cases, loss] = pair(/做满\s*([\d,]+)\s*例时亏\s*([\d,]+)\s*万元/, '例数与亏损');
  const [matCost, medRevenue] = pair(/百元医疗收入消耗卫生材料\s*\|\s*([\d,]+)\s*÷\s*([\d,]+)/, '百元耗材');
  const costRatio = doc.match(/成本收入比\s*\|[^|]*\|\s*([\d.]+)（([\d,]+) ÷ ([\d,]+)）/);
  if (!costRatio) throw new Error('正文里找不到成本收入比');
  return {
    pay,
    variable,
    fixedPerCase: num(/分摊固定成本\s*([\d,]+)\s*元/, '分摊固定成本'),
    fixedTotal: num(/科室固定成本\s*([\d,]+)\s*万元/, '科室固定成本'),
    cases,
    loss,
    variableLow: num(/把变动成本从\s*[\d,]+\s*降到\s*([\d,]+)/, '降耗材后的变动成本'),
    material: matCost,
    medRevenue,
    costRatio: Number(costRatio[1]),
    costRatioCost: Number(costRatio[2].replace(/,/g, '')),
    costRatioRev: Number(costRatio[3].replace(/,/g, '')),
  };
}

function compute(p) {
  const cm = p.pay - p.variable;
  const cmLow = p.pay - p.variableLow;
  const fixed = p.fixedTotal * 10000;
  const bep = fixed / cm;
  const bepLow = fixed / cmLow;
  const atCases = p.cases * cm - fixed;
  const atCasesLow = p.cases * cmLow - fixed;
  return {
    cm,
    cmLow,
    bep,
    bepCeil: Math.ceil(bepLow),
    atCases: atCases / 10000,
    atCasesLow: atCasesLow / 10000,
    leverage: (p.cases * cmLow) / atCasesLow,
    materialRate: (p.material / p.medRevenue) * 100,
    costRatio: p.costRatioCost / p.costRatioRev,
    cmRate: (cm / p.pay) * 100,
  };
}

const wan = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.cm === 4200 && doc.includes('12,800 − 8,600 = 4,200'), '边际贡献 4,200 元');
  expect(r.bep === 3500 && doc.includes('14,700,000 ÷ 4,200 = 3,500'), '保本量 3,500 例');
  expect(Math.round(r.atCases) === -p.loss && doc.includes('−126'), '3,200 例时亏 126 万元');
  expect(r.cmLow === 4800 && doc.includes('3,200 × 4,800 = 1,536'), '降耗材后边际贡献 4,800 元');
  expect(r.bepCeil === 3063 && doc.includes('3,063'), '新保本量 3,063 例（3,062.5 进位）');
  expect(Math.round(r.atCasesLow) === 66 && doc.includes('+66 万元'), '3,200 例时盈余 66 万元');
  expect(Math.abs(r.leverage - 23.3) < 0.05 && doc.includes('23.3 倍'), '经营杠杆 23.3 倍');
  expect(Math.abs(r.materialRate - 26.5) < 0.05 && doc.includes('26.5 元'), '百元收入耗材 26.5 元');
  expect(Math.abs(r.costRatio - 0.96) < 0.005 && doc.includes('0.96'), '成本收入比 0.96');
  expect(Math.abs(r.cmRate - 32.8) < 0.05 && doc.includes('32.8%'), '边际贡献率 32.8%');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 9 章 多做不一定多赚');
  console.log('');
  console.log(`单例（元）：支付 ${wan(p.pay)} − 变动 ${wan(p.variable)} = 边际贡献 ${wan(r.cm)}；全成本 ${wan(p.variable + p.fixedPerCase)}，每例结余 ${wan(p.pay - (p.variable + p.fixedPerCase))}`);
  console.log(`保本量：${wan(p.fixedTotal)} 万 ÷ ${wan(r.cm)} = ${wan(r.bep)} 例；${wan(p.cases)} 例时结余 ${wan(r.atCases)} 万元`);
  console.log('');
  console.log('降耗材 600 元后：');
  console.log(`  边际贡献 ${wan(r.cmLow)} 元，保本量 ${(p.fixedTotal * 10000 / r.cmLow).toFixed(1)} → 进位 ${wan(r.bepCeil)} 例`);
  console.log(`  ${wan(p.cases)} 例时结余 ${wan(r.atCasesLow)} 万元；经营杠杆 ${r.leverage.toFixed(1)} 倍`);
  console.log('');
  console.log(`三个指标：百元收入耗材 ${r.materialRate.toFixed(1)} 元、成本收入比 ${r.costRatio.toFixed(2)}、边际贡献率 ${r.cmRate.toFixed(1)}%`);
  console.log('结论：增收要看别人给不给病人，降本只看自己做不做。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 保本量与杠杆由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成价格谈判依据或绩效方案。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
