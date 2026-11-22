#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 1 章 医院没有利润，只有结余
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/01-k1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文给了一组同一家医院同一年的四个数。脚本从正文抓出六个基础参数，
 * 按四种口径各算一遍，再与正文报告的结果逐项对账 —— 正文改数而脚本没跟上，会直接抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');
const MINUS = '\u2212';

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

/** 抓正文里的六个基础参数（万元） */
function parseParams(doc) {
  const grab = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    return Number(m[1].replace(/,/g, ''));
  };
  return {
    medical: grab(/年医疗收入\s*([\d,]+)\s*万元/, '年医疗收入'),
    fiscal: grab(/财政基本拨款\s*([\d,]+)\s*万元/, '财政基本拨款'),
    expense: grab(/业务活动费用\s*([\d,]+)\s*万元/, '业务活动费用'),
    depreciation: grab(/固定资产折旧\s*([\d,]+)\s*万元/, '固定资产折旧'),
    receivable: grab(/应收医保款一年增加的\s*([\d,]+)\s*万元/, '应收医保款增加'),
    welfare: grab(/公益性任务的直接成本\s*([\d,]+)\s*万元/, '公益性任务成本'),
  };
}

/** 四种口径：会计结余、加回折旧、扣除应收增加、剔除公益性任务 */
function compute(p) {
  const income = p.medical + p.fiscal;
  const surplus = income - p.expense;
  const cashAbility = surplus + p.depreciation;
  const operatingCash = cashAbility - p.receivable;
  const operating = surplus + p.welfare;
  return {
    income,
    surplus,
    cashAbility,
    operatingCash,
    operating,
    gapRate: ((p.expense - income) / income) * 100,
    depMultiple: p.depreciation / Math.abs(surplus),
  };
}

const fmt = (n) => (n < 0 ? MINUS + Math.abs(n).toLocaleString('en-US') : n.toLocaleString('en-US'));

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.income === 86000 && doc.includes('86,000 万元对应费用 89,000 万元'), '收入 81,800 + 4,200 = 86,000');
  expect(r.surplus === -3000 && doc.includes(`${MINUS}3,000`), '会计结余 = −3,000');
  expect(r.cashAbility === 3100 && doc.includes(`${MINUS}3,000 + 6,100`), '加回折旧 = +3,100');
  expect(r.operatingCash === -100 && doc.includes('3,100 − 3,200'), '扣除应收增加 = −100');
  expect(r.operating === -300 && doc.includes(`${MINUS}3,000 + 2,700`), '剔除公益性任务 = −300');
  expect(Math.abs(r.gapRate - 3.5) < 0.1 && doc.includes('缺口 3.5%'), '收支缺口 3.5%');
  expect(r.depMultiple > 2 && r.depMultiple < 2.1 && doc.includes('相当于结余绝对值的两倍'), '折旧约为结余绝对值两倍');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 1 章 医院没有利润，只有结余');
  console.log('');
  console.log(`基础参数（万元）：医疗收入 ${fmt(p.medical)}、财政拨款 ${fmt(p.fiscal)}、费用 ${fmt(p.expense)}`);
  console.log(`　　　　　　　　　折旧 ${fmt(p.depreciation)}、应收增加 ${fmt(p.receivable)}、公益性成本 ${fmt(p.welfare)}`);
  console.log('');
  console.log('四种口径（万元）：');
  console.log(`  会计结余　　　　${fmt(p.medical)} + ${fmt(p.fiscal)} − ${fmt(p.expense)} = ${fmt(r.surplus)}`);
  console.log(`  加回折旧　　　　${fmt(r.surplus)} + ${fmt(p.depreciation)} = ${fmt(r.cashAbility)}`);
  console.log(`  扣除应收增加　　${fmt(r.cashAbility)} − ${fmt(p.receivable)} = ${fmt(r.operatingCash)}`);
  console.log(`  剔除公益性任务　${fmt(r.surplus)} + ${fmt(p.welfare)} = ${fmt(r.operating)}`);
  console.log('');
  console.log(`收支缺口 ${r.gapRate.toFixed(1)}%；折旧相当于结余绝对值的 ${r.depMultiple.toFixed(2)} 倍。`);
  console.log('结论：四个数各有各的问题，不能互相质问 —— 哪一段亏、亏给谁、由谁补。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意，不构成对任何机构的财务评价或审计意见。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
