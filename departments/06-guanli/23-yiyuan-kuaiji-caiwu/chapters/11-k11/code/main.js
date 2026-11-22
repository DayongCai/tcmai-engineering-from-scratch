#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 11 章 账上有钱，账上没钱
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/11-k11/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文从结余 3,600 走到经营现金 6,000，再走到缺口 3,107；
 * 另有一个设备投资的净现值算例。脚本从正文抓参数重算，再与正文印出的结果对账。
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
  const head = doc.match(/上年结余\s*([\d,]+)\s*万元、折旧\s*([\d,]+)\s*万元、应收医保款增加\s*([\d,]+)\s*万元/);
  if (!head) throw new Error('正文里找不到间接法三项');
  const loan = doc.match(/上报\s*([\d,]+)\s*万元住院楼项目：(\d+) 年期、年利率\s*([\d.]+)%、等额本金，首年还本\s*([\d,]+)\s*万元、付息\s*([\d,]+)\s*万元/);
  if (!loan) throw new Error('正文里找不到住院楼项目条件');
  const cost = doc.match(/一个月的付现成本是\s*\(([\d,]+)\s*−\s*([\d,]+)\)\s*÷ 12 = ([\d,]+)\s*万元[。；]缺口\s*([\d,]+)\s*万元/);
  if (!cost) throw new Error('正文里找不到付现成本与缺口');
  const ar = doc.match(/年医保结算收入\s*([\d,]+)\s*万元，期末应收医保款\s*([\d,]+)\s*万元/);
  if (!ar) throw new Error('正文里找不到医保应收');
  const eq = doc.match(/一个\s*([\d,]+)\s*万元的设备项目（演算设定）：年新增业务收入\s*([\d,]+)\s*万元，变动成本率\s*(\d+)%，新增运维\s*([\d,]+)\s*万元\/年，折旧按\s*(\d+)\s*年、残值\s*(\d+)%/);
  if (!eq) throw new Error('正文里找不到设备项目条件');
  const stock = doc.match(/每降 5 天，按年耗材\s*([\d,]+)\s*万元计，可释放现金\s*[\d,]+\s*÷ 365 × 5 ≈ ([\d,]+)\s*万元/);
  if (!stock) throw new Error('正文里找不到库存释放算式');
  return {
    surplus: Number(head[1].replace(/,/g, '')),
    depreciation: Number(head[2].replace(/,/g, '')),
    arIncrease: Number(head[3].replace(/,/g, '')),
    project: Number(loan[1].replace(/,/g, '')),
    years: Number(loan[2]),
    rate: Number(loan[3]),
    principalY1: Number(loan[4].replace(/,/g, '')),
    interestY1: Number(loan[5].replace(/,/g, '')),
    cashCost: Number(cost[1].replace(/,/g, '')),
    depInCost: Number(cost[2].replace(/,/g, '')),
    monthly: Number(cost[3].replace(/,/g, '')),
    monthGap: Number(cost[4].replace(/,/g, '')),
    insuranceRevenue: Number(ar[1].replace(/,/g, '')),
    arBalance: Number(ar[2].replace(/,/g, '')),
    materialCost: Number(stock[1].replace(/,/g, '')),
    stockRelease: Number(stock[2].replace(/,/g, '')),
    device: Number(eq[1].replace(/,/g, '')),
    newRevenue: Number(eq[2].replace(/,/g, '')),
    variableRate: Number(eq[3]),
    newOpex: Number(eq[4].replace(/,/g, '')),
    depYears: Number(eq[5]),
    residual: Number(eq[6]),
  };
}

function compute(p) {
  const opCash = p.surplus + p.depreciation - p.arIncrease;
  const service = p.principalY1 + p.interestY1;
  const remaining = opCash - service;
  const arDays = (p.arBalance / p.insuranceRevenue) * 365;
  const capitalCost = (p.arBalance * 4.2) / 100;
  const cm = p.newRevenue * ((100 - p.variableRate) / 100);
  const netCash = cm - p.newOpex;
  const dep = (p.device * (100 - p.residual)) / 100 / p.depYears;
  const accounting = cm - p.newOpex - dep;
  const pvFactor = (1 - Math.pow(1.05, -p.depYears)) / 0.05;
  const salvage = (p.device * p.residual) / 100;
  const pv = netCash * pvFactor + salvage / Math.pow(1.05, p.depYears);
  return {
    opCash,
    service,
    remaining,
    monthly: (p.cashCost - p.depInCost) / 12,
    monthGap: (p.cashCost - p.depInCost) / 12 - remaining,
    arDays,
    capitalCost,
    cm,
    netCash,
    payback: p.device / netCash,
    dep,
    accounting,
    pvFactor,
    pv,
    npv: pv - p.device,
  };
}

const wan = (n) => Math.round(n).toLocaleString('en-US');
const wan1 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.opCash === p.surplus + p.depreciation - p.arIncrease && doc.includes('3,600 + 4,200 − 1,800'), '经营现金 3,600 + 4,200 − 1,800 = 6,000');
  expect(r.service === 2840 && Math.abs(r.remaining - 3160) < 1e-9, '首年本息 2,840，剩 3,160 万元');
  expect(Math.abs(r.monthly - p.monthly) < 1 && p.monthly === 6267, '月付现成本 (79,400 − 4,200) ÷ 12 = 6,267');
  expect(Math.abs(r.monthGap - p.monthGap) < 1 && p.monthGap === 3107, '缺口 3,107 万元');
  expect(Math.abs(r.arDays - 89.8) < 0.05 && doc.includes('89.8 天'), '医保应收周转 89.8 天');
  expect(Math.abs(r.capitalCost - 537.6) < 0.01 && doc.includes('537.6 万元'), '应收占用资金成本 537.6 万元');
  expect(p.stockRelease === 301 && doc.includes('≈ 301 万元'), '库存降 5 天释放 301 万元');
  expect(r.cm === 756 && r.netCash === 636, '年边际贡献 756、年净现金 636');
  expect(Math.abs(r.payback - 4.72) < 0.01 && doc.includes('4.72'), '静态回收期 4.72 年');
  expect(Math.abs(r.accounting - 279.75) < 0.01 && doc.includes('279.75'), '会计年结余 279.75 万元');
  expect(Math.abs(r.pvFactor - 6.4632) < 0.001 && doc.includes('6.4632'), '年金现值系数 6.4632');
  expect(Math.round(r.npv) === 1212 && doc.includes('+1,212'), '净现值 +1,212 万元');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 11 章 账上有钱，账上没钱');
  console.log('');
  console.log(`间接法：结余 ${wan(p.surplus)} + 折旧 ${wan(p.depreciation)} − 应收增加 ${wan(p.arIncrease)} = 经营现金 ${wan(r.opCash)} 万元`);
  console.log(`首年还本付息 ${wan(p.principalY1)} + ${wan(p.interestY1)} = ${wan(r.service)} 万元，剩 ${wan(r.remaining)} 万元`);
  console.log(`一个月的付现成本 (${wan(p.cashCost)} − ${wan(p.depInCost)}) ÷ 12 = ${wan(r.monthly)} 万元，缺口 ${wan(r.monthGap)} 万元`);
  console.log('');
  console.log(`医保应收：${wan(p.arBalance)} ÷ ${wan(p.insuranceRevenue)} × 365 = ${wan1(r.arDays)} 天`);
  console.log(`占用资金成本：${wan(p.arBalance)} × 4.2% = ${wan1(r.capitalCost)} 万元；库存降 5 天释放 ${wan(p.stockRelease)} 万元`);
  console.log('');
  console.log(`设备项目（${wan(p.device)} 万元）：边际贡献 ${wan(r.cm)}，净现金 ${wan(r.netCash)}，回收期 ${r.payback.toFixed(2)} 年`);
  console.log(`  会计结余 = ${wan(r.cm)} − ${wan(p.newOpex)} − ${r.dep.toFixed(2)} = ${r.accounting.toFixed(2)} 万元`);
  console.log(`  现值 = ${wan(r.netCash)} × ${r.pvFactor.toFixed(4)} + 残值现值 = ${wan(r.pv)} → 净现值 +${wan(r.npv)} 万元`);
  console.log('结论：结余是意见，现金流是事实；用一年的现金承担十年的承诺，中间必须留周转。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 缺口与净现值由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成融资建议或投资决策。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
