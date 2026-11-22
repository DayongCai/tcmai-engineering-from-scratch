#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 6 章 家底分两半
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/06-k6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的资金配对（84,000 对 80,000）、三条债务线、两项基金提取都可复算。
 * 脚本从正文抓数，算出两个 4,000 万元的缺口，再与正文印出的比率对账。
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
  const [nonCurAsset, nonCurLiab] = pair(/非流动资产\s*([\d,]+)\s*万元减去非流动负债\s*([\d,]+)\s*万元/, '非流动资产与非流动负债');
  const [debtLiab, debtAssets] = pair(/资产负债率\s*\|\s*([\d,]+)\s*÷\s*([\d,]+)/, '资产负债率');
  const cover = doc.match(/偿债备付率\s*\|\s*\(盈余\s*([\d,]+)\s*\+\s*折旧\s*([\d,]+)\)\s*÷\s*年还本付息\s*([\d,]+)/);
  if (!cover) throw new Error('正文里找不到偿债备付率');
  return {
    netAssets: num(/某院净资产\s*([\d,]+)\s*万元/, '净资产'),
    nonCurAsset,
    nonCurLiab,
    assets: debtAssets,
    liab: debtLiab,
    interestDebt: num(/带息负债设为\s*([\d,]+)\s*万元/, '带息负债'),
    curAssets: num(/其中：流动资产\s*\|\s*([\d,]+)/, '流动资产'),
    curLiab: num(/其中：流动负债\s*\|\s*([\d,]+)/, '流动负债'),
    surplus: Number(cover[1].replace(/,/g, '')),
    depreciation: Number(cover[2].replace(/,/g, '')),
    debtService: Number(cover[3].replace(/,/g, '')),
  };
}

function compute(p) {
  const longFund = p.nonCurLiab + p.netAssets;
  return {
    longFund,
    longGap: p.nonCurAsset - longFund,
    shortGap: p.curLiab - p.curAssets,
    debtRatio: (p.liab / p.assets) * 100,
    interestRatio: (p.interestDebt / p.assets) * 100,
    coverRatio: (p.surplus + p.depreciation) / p.debtService,
    welfareFund: p.surplus * 0.4,
    riskFund: 83000 * 0.002,
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
  expect(p.curLiab + p.nonCurLiab === p.liab, '流动 40,000 + 非流动 5,600 = 负债 45,600');
  expect(r.longFund === 80000 && doc.includes('5,600 + 74,400 = 80,000'), '长期资金 80,000 万元');
  expect(r.longGap === 4000 && doc.includes('比 84,000 万元少 4,000 万元'), '长期缺口 4,000 万元');
  expect(r.shortGap === 4000 && doc.includes('缺口同样是 4,000 万元'), '流动缺口 4,000 万元，与长期缺口相等');
  expect(Math.abs(r.debtRatio - 38.0) < 0.05 && doc.includes('38.0%'), '资产负债率 38.0%');
  expect(Math.abs(r.interestRatio - 10.0) < 0.05 && doc.includes('10.0%'), '带息负债率 10.0%');
  expect(Math.abs(r.coverRatio - 2.47) < 0.005 && doc.includes('2.47'), '偿债备付率 2.47');
  expect(Math.abs(r.welfareFund - 720) < 1e-9 && doc.includes('即 720 万元'), '职工福利基金 1,800 × 40% = 720');
  expect(Math.abs(r.riskFund - 166) < 1e-9 && doc.includes('即 166 万元'), '医疗风险基金 83,000 × 2‰ = 166');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 6 章 家底分两半');
  console.log('');
  console.log(`资金配对（万元）：长期资金 = 非流动负债 ${wan(p.nonCurLiab)} + 净资产 ${wan(p.netAssets)} = ${wan(r.longFund)}`);
  console.log(`  非流动资产 ${wan(p.nonCurAsset)} − 长期资金 ${wan(r.longFund)} = ${wan(r.longGap)}（短期资金被长期占用）`);
  console.log(`  流动资产 ${wan(p.curAssets)} − 流动负债 ${wan(p.curLiab)} = ${wan(-r.shortGap)}（同一个缺口的另一说法）`);
  console.log('');
  console.log('三条债务线：');
  console.log(`  资产负债率　${wan(p.liab)} ÷ ${wan(p.assets)} = ${pct(r.debtRatio)}`);
  console.log(`  带息负债率　${wan(p.interestDebt)} ÷ ${wan(p.assets)} = ${pct(r.interestRatio)}`);
  console.log(`  偿债备付率　(${wan(p.surplus)} + ${wan(p.depreciation)}) ÷ ${wan(p.debtService)} = ${r.coverRatio.toFixed(2)}`);
  console.log('');
  console.log(`两项提取：职工福利基金 ${wan(r.welfareFund)}（1,800 × 40%）、医疗风险基金 ${wan(r.riskFund)}（83,000 × 2‰）。`);
  console.log('结论：净资产增加不等于可动用资金增加；负债能力不等于实力。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 缺口与比率由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成融资建议或信用评价。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
