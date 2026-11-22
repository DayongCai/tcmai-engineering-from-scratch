#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 5 章 两笔最贵的资产都不显眼
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/05-k5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的周转表（日均消耗 40、库存 1,120／1,800、资金成本 4%）与折旧表
 * （原值 600、残值率 5%、8 年与 10 年）都可复算。脚本从正文抓参数重算，
 * 再与正文印出的天数、折旧额、安全库存对账。
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
  const both = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    return [Number(m[1].replace(/,/g, '')), Number(m[2].replace(/,/g, ''))];
  };
  const bm = doc.match(/同城另一家规模相近的医院周转\s*(\d+)\s*天，库存\s*([\d,]+)\s*万元/);
  if (!bm) throw new Error('正文里找不到同城对比医院');
  const stockB = Number(bm[2].replace(/,/g, ''));
  const over = num(/多压\s*([\d,]+)\s*万元/, '多压库存');
  const device = doc.match(/一台\s*([\d,]+)\s*万元设备的折旧年限从\s*(\d+)\s*年改成\s*(\d+)\s*年/);
  if (!device) throw new Error('正文里找不到折旧年限变更');
  const [stockA, daysA] = both(/库存\s*([\d,]+)\s*万元，周转\s*(\d+)\s*天/, 'A 院库存');
  const [safeDaily, leadDays, factor] = (() => {
    const m = doc.match(/日均消耗\s*([\d,]+)\s*万元、补货\s*(\d+)\s*天、安全系数\s*([\d.]+)/);
    if (!m) throw new Error('正文里找不到安全库存参数');
    return [Number(m[1].replace(/,/g, '')), Number(m[2]), Number(m[3])];
  })();
  return {
    daily: num(/药品日均消耗\s*([\d,]+)\s*万元/, '日均消耗'),
    stockA,
    daysA,
    stockB,
    over,
    costRate: num(/按\s*(\d+)%\s*的资金成本算/, '资金成本率'),
    device: Number(device[1].replace(/,/g, '')),
    lifeShort: Number(device[2]),
    lifeLong: Number(device[3]),
    residual: num(/残值率\s*(\d+)%/, '残值率'),
    safeDaily,
    leadDays,
    factor,
  };
}

function compute(p) {
  return {
    daysA: p.stockA / p.daily,
    daysB: p.stockB / p.daily,
    overStock: p.stockB - p.stockA,
    costA: (p.stockA * p.costRate) / 100,
    costB: (p.stockB * p.costRate) / 100,
    costOver: (p.over * p.costRate) / 100,
    depShort: (p.device * (100 - p.residual)) / 100 / p.lifeShort,
    depLong: (p.device * (100 - p.residual)) / 100 / p.lifeLong,
    depGap: (p.device * (100 - p.residual)) / 100 / p.lifeShort - (p.device * (100 - p.residual)) / 100 / p.lifeLong,
    safety: p.safeDaily * p.leadDays * p.factor,
  };
}

const wan = (n) => n.toLocaleString('en-US');
const num2 = (n) => n.toFixed(2);

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(Math.abs(r.daysA - 28) < 1e-9 && doc.includes('28.0'), 'A 院 1,120 ÷ 40 = 28 天');
  expect(Math.abs(r.daysB - 45) < 1e-9 && doc.includes('45.0'), 'B 院 1,800 ÷ 40 = 45 天');
  expect(r.overStock === p.over && p.over === 680, '两院库存差 680 万元');
  expect(Math.abs(r.costOver - 27.2) < 1e-9 && doc.includes('27.2'), '680 × 4% = 27.2 万元资金成本');
  expect(Math.abs(r.costA - 44.8) < 1e-9 && Math.abs(r.costB - 72) < 1e-9, 'A 44.8、B 72.0');
  expect(Math.abs(r.depShort - 71.25) < 1e-9 && doc.includes('71.25'), '600 × 95% ÷ 8 = 71.25');
  expect(Math.abs(r.depLong - 57) < 1e-9 && doc.includes('57.00'), '600 × 95% ÷ 10 = 57.00');
  expect(Math.abs(r.depGap - 14.25) < 1e-9 && doc.includes('14.25'), '年限差一年成本差 14.25 万元');
  expect(Math.abs(r.safety - 364) < 1e-9 && doc.includes('364 万元'), '安全库存 40 × 7 × 1.3 = 364 万元');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 5 章 两笔最贵的资产都不显眼');
  console.log('');
  console.log(`周转（日均消耗 ${p.daily} 万元）：`);
  console.log(`  A 院 ${wan(p.stockA)} ÷ ${p.daily} = ${r.daysA.toFixed(1)} 天，资金成本 ${num2(r.costA)} 万元`);
  console.log(`  B 院 ${wan(p.stockB)} ÷ ${p.daily} = ${r.daysB.toFixed(1)} 天，资金成本 ${num2(r.costB)} 万元`);
  console.log(`  多压 ${wan(r.overStock)} 万元，按 ${p.costRate}% 一年白付 ${num2(r.costOver)} 万元`);
  console.log('');
  console.log(`折旧（原值 ${wan(p.device)} 万元，残值率 ${p.residual}%）：`);
  console.log(`  ${p.lifeShort} 年：${wan(p.device)} × ${100 - p.residual}% ÷ ${p.lifeShort} = ${num2(r.depShort)} 万元/年`);
  console.log(`  ${p.lifeLong} 年：${wan(p.device)} × ${100 - p.residual}% ÷ ${p.lifeLong} = ${num2(r.depLong)} 万元/年`);
  console.log(`  差 ${num2(r.depGap)} 万元/年 —— 总额不变，只改变出现在哪一年`);
  console.log('');
  console.log(`安全库存 = ${p.safeDaily} × ${p.leadDays} × ${p.factor} = ${num2(r.safety)} 万元。`);
  console.log('结论：库存压得少、年限拉得长，都不改变资源消耗。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 天数与折旧额由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成资产评估意见或资产处置建议。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
