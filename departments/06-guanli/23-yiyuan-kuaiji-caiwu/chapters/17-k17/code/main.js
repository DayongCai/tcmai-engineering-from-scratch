#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 17 章 一笔 800 万元的设备
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/17-k17/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文同一笔拨款走了两套账，另有一个 DRG 与项目收费的对照。
 * 脚本从正文抓参数，重算两套结余、差额与 DRG 支付，再逐项对账。
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
  const grant = doc.match(/收到财政项目拨款\s*([\d,]+)\s*万元，当年全额买了设备，设备按\s*(\d+)\s*年折旧/);
  if (!grant) throw new Error('正文里找不到拨款与折旧年限');
  const ward = doc.match(/某病区一年\s*([\d,]+)\s*例，总权重\s*([\d,]+)（平均每例\s*([\d.]+)），费率\s*([\d,]+)\s*元\/权重/);
  if (!ward) throw new Error('正文里找不到病区例数与费率');
  const drg = doc.match(/DRG 支付 = ([\d,]+) × ([\d,]+) = ([\d,]+)\s*万元\*{0,2}（平均每例\s*([\d,]+)\s*元）/);
  if (!drg) throw new Error('正文里找不到 DRG 支付算式');
  return {
    grant: Number(grant[1].replace(/,/g, '')),
    life: Number(grant[2]),
    cases: Number(ward[1].replace(/,/g, '')),
    weight: Number(ward[2].replace(/,/g, '')),
    perCase: Number(ward[3]),
    rate: Number(ward[4].replace(/,/g, '')),
    drgPaid: Number(drg[3].replace(/,/g, '')),
    drgPerCase: Number(drg[4].replace(/,/g, '')),
    feeForService: num(/同批病例若按项目收费，为\s*([\d,]+)\s*万元/, '项目收费'),
  };
}

function compute(p) {
  const dep = p.grant / p.life;
  const finSurplus = p.grant - dep;
  const budgetSurplus = p.grant - p.grant;
  const drg = (p.weight * p.rate) / 10000;
  const diff = drg - p.feeForService;
  return {
    dep,
    finSurplus,
    budgetSurplus,
    netAsset: p.grant - dep,
    drg,
    perCase: (drg * 10000) / p.cases,
    diff,
    diffRate: (diff / p.feeForService) * 100,
    execRate: (p.grant / p.grant) * 100,
    surplusRate: (finSurplus / p.grant) * 100,
  };
}

const wan = (n) => Math.round(n).toLocaleString('en-US');

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.dep === 80 && doc.includes('800 ÷ 10 = 80'), '年折旧 800 ÷ 10 = 80 万元');
  expect(r.finSurplus === 720 && doc.includes('**本期盈余 720 万元**'), '财务本期盈余 720 万元');
  expect(r.budgetSurplus === 0, '预算结余 0 元');
  expect(r.netAsset === 720 && doc.includes('差额 720 万元 = 固定资产净值'), '差额 720 万元 = 固定资产净值');
  expect(r.execRate === 100 && doc.includes('预算执行率 100%'), '预算执行率 100%');
  expect(Math.abs(r.drg - p.drgPaid) < 1e-9 && p.drgPaid === 1029, 'DRG 支付 1,050 × 9,800 = 1,029 万元');
  expect(Math.abs(r.perCase - p.drgPerCase) < 1 && p.drgPerCase === 8575, '平均每例 8,575 元');
  expect(Math.abs(r.diff - -157) < 1e-9 && doc.includes('−157 万元'), '差额 −157 万元');
  expect(Math.abs(r.diffRate - -13.2) < 0.06 && doc.includes('13.2%'), '降幅 13.2%');
  expect(Math.abs(p.weight / p.cases - p.perCase) < 1e-9, '平均每例权重 1,050 ÷ 1,200 = 0.875');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 17 章 一笔 800 万元的设备');
  console.log('');
  console.log(`财政项目拨款 ${wan(p.grant)} 万元，设备按 ${p.life} 年折旧：年折旧 ${wan(r.dep)} 万元`);
  console.log(`  财务会计：收入 ${wan(p.grant)} − 费用 ${wan(r.dep)} = 本期盈余 ${wan(r.finSurplus)} 万元`);
  console.log(`  预算会计：预算收入 ${wan(p.grant)} − 预算支出 ${wan(p.grant)} = 预算结余 ${r.budgetSurplus} 元`);
  console.log(`  差额 ${wan(r.finSurplus)} 万元 = 固定资产净值 ${wan(r.netAsset)} 万元`);
  console.log(`  执行率 ${r.execRate.toFixed(0)}%，会计结余率 ${r.surplusRate.toFixed(0)}% —— 两个信号各自都对`);
  console.log('');
  console.log(`DRG：${wan(p.cases)} 例、总权重 ${wan(p.weight)}（每例 ${p.perCase}）、费率 ${wan(p.rate)} 元/权重`);
  console.log(`  支付 = ${wan(p.weight)} × ${wan(p.rate)} = ${wan(r.drg)} 万元（每例 ${wan(r.perCase)} 元）`);
  console.log(`  按项目收费 ${wan(p.feeForService)} 万元，差额 ${wan(r.diff)} 万元（${r.diffRate.toFixed(1)}%）`);
  console.log('结论：两套结余不是两种说法，是两个问题；差额必须解释，不能合并。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 两套结余与 DRG 支付由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成会计处理意见或医保结算结论。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
