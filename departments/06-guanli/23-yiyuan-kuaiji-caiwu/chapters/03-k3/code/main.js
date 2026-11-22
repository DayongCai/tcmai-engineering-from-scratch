#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 3 章 一笔业务两张凭证
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/03-k3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文给了本月一笔收入的完整走账与一张勾稽表。脚本从正文抓出七个金额，
 * 现算两个体系的差额与三类差异合计，验证「差异 = 应收净增」这条恒等式，
 * 以及「采购 − 存货净增 = 当期消耗」这条复算链条。
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
    revenue: num(/确认医疗收入\s*([\d,]+)\s*万元/, '确认医疗收入'),
    cash: num(/实际收到现金\s*([\d,]+)\s*万元/, '实收现金'),
    arBegin: num(/应收医疗款从月初\s*([\d,]+)\s*万元/, '月初应收'),
    arEnd: num(/涨到月末\s*([\d,]+)\s*万元/, '月末应收'),
    depreciation: num(/计提折旧\s*([\d,]+)\s*万元/, '计提折旧'),
    consumed: num(/消耗\s*([\d,]+)\s*\|/, '存货消耗'),
    purchased: num(/采购\s*([\d,]+)\s*\|/, '存货采购'),
  };
}

function compute(p) {
  const arNet = p.arEnd - p.arBegin;
  const revenueGap = p.revenue - p.cash;
  const stockNet = p.purchased - p.consumed;
  const totalGap = revenueGap + p.depreciation + stockNet;
  return {
    arNet,
    revenueGap,
    stockNet,
    totalGap,
    arEndFromFlow: p.arBegin + p.revenue - p.cash,
    balanced: revenueGap === arNet,
  };
}

const wan = (n) => n.toLocaleString('en-US');

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.arEndFromFlow === p.arEnd, '月初 1,100 + 收入 7,200 − 收现 6,400 = 月末 1,900');
  expect(r.balanced && r.arNet === 800, '收入差 800 等于应收净增 800');
  expect(doc.includes('1,100 + 7,200 − 6,400 = 1,900'), '正文印有同一条流水式');
  expect(r.stockNet === 180 && doc.includes('2,280 − 180 = 2,100'), '采购 2,280 − 库存净增 180 = 消耗 2,100');
  expect(r.totalGap === 1500 && doc.includes('800 + 520 + 180'), '三类差异合计 1,500');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 3 章 一笔业务两张凭证');
  console.log('');
  console.log(`本月收入流水（万元）：月初应收 ${wan(p.arBegin)} + 确认收入 ${wan(p.revenue)} − 收现 ${wan(p.cash)} = 月末应收 ${wan(r.arEndFromFlow)}`);
  console.log(`两个体系收入差：${wan(p.revenue)} − ${wan(p.cash)} = ${wan(r.revenueGap)}；应收净增 ${wan(r.arNet)}　→ ${r.balanced ? '恒等式成立' : '对不上'}`);
  console.log('');
  console.log('勾稽表三类差异（万元）：');
  console.log(`  医疗收入差　${wan(r.revenueGap)}　← 应收医疗款净增`);
  console.log(`  折旧费用　　${wan(p.depreciation)}　← 非现金费用，预算会计无对应`);
  console.log(`  存货　　　　${wan(r.stockNet)}　← 采购 ${wan(p.purchased)} − 消耗 ${wan(p.consumed)}`);
  console.log(`  合计差异　　${wan(r.totalGap)}`);
  console.log('');
  console.log(`存货复算：${wan(p.purchased)} − ${wan(r.stockNet)} = ${wan(p.consumed)}，差额是还躺在库里的钱。`);
  console.log('结论：两套账对得上，说明没有漏记；对不上，才说明有一笔只记了一边。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 金额由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成账务处理指令或审计意见。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
