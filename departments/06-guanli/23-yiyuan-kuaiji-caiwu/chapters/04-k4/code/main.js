#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 4 章 三张表要一起读
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/04-k4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的四组结构比率、三层结余、间接法现金流调节表都写在文里。
 * 脚本从正文抓出各项金额，逐项现算，再与正文印出的比率和结果对账。
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
  const head = doc.match(/资产\s*([\d,]+)\s*万元、负债\s*([\d,]+)\s*万元、净资产\s*([\d,]+)\s*万元/);
  if (!head) throw new Error('正文里找不到资产／负债／净资产三项');
  const [curAssets, curLiab] = pair(/流动比率\s*\|\s*([\d,]+)\s*÷\s*([\d,]+)/, '流动比率');
  const quick = doc.match(/速动比率\s*\|\s*\(([\d,]+)\s*−\s*([\d,]+)\)\s*÷\s*([\d,]+)/);
  if (!quick) throw new Error('正文里找不到速动比率');
  const [nonCurAsset, totalAsset] = pair(/非流动资产占比\s*\|\s*([\d,]+)\s*÷\s*([\d,]+)/, '非流动资产占比');
  return {
    assets: Number(head[1].replace(/,/g, '')),
    liab: Number(head[2].replace(/,/g, '')),
    netAssets: Number(head[3].replace(/,/g, '')),
    curAssets,
    curLiab,
    stock: Number(quick[2].replace(/,/g, '')),
    nonCurAsset,
    totalAsset,
    medRevenue: num(/医疗收入\s*([\d,]+)\s*−\s*医疗业务成本/, '医疗收入'),
    medCost: num(/−\s*医疗业务成本\s*([\d,]+)/, '医疗业务成本'),
    fiscalSubsidy: num(/\+ ([\d,]+) − 单位管理费用/, '财政基本补助'),
    adminCost: num(/− 单位管理费用\s*([\d,]+)/, '单位管理费用'),
    otherCost: num(/1,900 − 其他费用\s*([\d,]+)/, '其他费用'),
    surplus: num(/本期盈余\s*\|\s*([\d,]+)/, '本期盈余'),
    depreciation: num(/固定资产折旧\s*\|\s*([\d,]+)/, '折旧'),
    arIncrease: num(/应收医疗款增加\s*\|\s*([\d,]+)/, '应收增加'),
    apIncrease: num(/应付账款增加\s*\|\s*([\d,]+)/, '应付增加'),
  };
}

function compute(p) {
  const gross = p.medRevenue - p.medCost;
  const afterSubsidy = gross + p.fiscalSubsidy - p.adminCost;
  const final = afterSubsidy - p.otherCost;
  const opCash = p.surplus + p.depreciation - p.arIncrease + p.apIncrease;
  return {
    debtRatio: (p.liab / p.assets) * 100,
    currentRatio: p.curAssets / p.curLiab,
    quickRatio: (p.curAssets - p.stock) / p.curLiab,
    fixedShare: (p.nonCurAsset / p.totalAsset) * 100,
    gross,
    grossMargin: (gross / p.medRevenue) * 100,
    afterSubsidy,
    final,
    opCash,
    shortGap: p.curLiab - p.curAssets,
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
  expect(p.assets === p.liab + p.netAssets, '资产 120,000 = 负债 45,600 + 净资产 74,400');
  expect(Math.abs(r.debtRatio - 38.0) < 0.05 && doc.includes('38.0%'), '资产负债率 38.0%');
  expect(Math.abs(r.currentRatio - 0.9) < 0.005 && doc.includes('0.90'), '流动比率 0.90');
  expect(Math.abs(r.quickRatio - 0.7) < 0.005 && doc.includes('0.70'), '速动比率 0.70');
  expect(Math.abs(r.fixedShare - 70.0) < 0.05 && doc.includes('70.0%'), '非流动资产占比 70.0%');
  expect(r.shortGap === 4000 && doc.includes('多 4,000 万元'), '短债比短资产多 4,000 万元');
  expect(r.gross === 3600 && r.afterSubsidy === 1900 && r.final === 1800, '三层结余 3,600 → 1,900 → 1,800');
  expect(Math.abs(r.grossMargin - 4.3) < 0.05 && doc.includes('毛利 4.3%'), '医疗服务毛利率 4.3%');
  expect(r.opCash === 4900 && doc.includes('1,800 + 6,100 − 3,200 + 200 = 4,900'), '经营现金 4,900');
  expect(r.final === p.surplus, '第三层结余等于本期盈余 1,800');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 4 章 三张表要一起读');
  console.log('');
  console.log('结构比率：');
  console.log(`  资产负债率　${wan(p.liab)} ÷ ${wan(p.assets)} = ${pct(r.debtRatio)}`);
  console.log(`  流动比率　　${wan(p.curAssets)} ÷ ${wan(p.curLiab)} = ${r.currentRatio.toFixed(2)}（短债多出 ${wan(r.shortGap)} 万元）`);
  console.log(`  速动比率　　(${wan(p.curAssets)} − ${wan(p.stock)}) ÷ ${wan(p.curLiab)} = ${r.quickRatio.toFixed(2)}`);
  console.log(`  非流动占比　${wan(p.nonCurAsset)} ÷ ${wan(p.totalAsset)} = ${pct(r.fixedShare)}`);
  console.log('');
  console.log('结余三层（万元）：');
  console.log(`  医疗服务毛结余　${wan(p.medRevenue)} − ${wan(p.medCost)} = ${wan(r.gross)}（毛利率 ${pct(r.grossMargin)}）`);
  console.log(`  加财政基本补助　${wan(r.gross)} + ${wan(p.fiscalSubsidy)} − ${wan(p.adminCost)} = ${wan(r.afterSubsidy)}`);
  console.log(`  加减其他项　　　${wan(r.afterSubsidy)} − ${wan(p.otherCost)} = ${wan(r.final)}`);
  console.log('');
  console.log('间接法现金流（万元）：');
  console.log(`  ${wan(p.surplus)} + ${wan(p.depreciation)} − ${wan(p.arIncrease)} + ${wan(p.apIncrease)} = ${wan(r.opCash)}`);
  console.log('结论：单看一张表，结论必然被它骗 —— 负债率健康的外观下藏着期限错配。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 比率由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成投资建议或信用评价。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
