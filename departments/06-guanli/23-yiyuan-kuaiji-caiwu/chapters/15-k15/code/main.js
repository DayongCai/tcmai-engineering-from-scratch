#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 15 章 六条提示里五条是白看的
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/15-k15/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的精确率、确认工时、映射比例与自动化人时都可复算：
 * 620 ÷ 3,720；3,720 × 1.5 分钟 = 93 小时/月；2,000 − 125 = 1,875 人时。
 * 脚本从正文抓参数重算，再与正文印出的结果对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function parseParams(doc) {
  const head = doc.match(/规则库\s*(\d+)\s*条，月交易约\s*([\d,]+)\s*笔，规则命中\s*([\d,]+)\s*笔（([\d.]+)%），人工逐笔确认后属于真问题的是\s*(\d+)\s*笔/);
  if (!head) throw new Error('正文里找不到规则库与命中');
  const map = doc.match(/收费项目\s*([\d,]+)\s*个，会计明细科目\s*(\d+)\s*个。平均每个科目承接\s*([\d.]+)\s*个项目/);
  if (!map) throw new Error('正文里找不到映射规模');
  const manual = doc.match(/每日 HIS 与财务接口\s*([\d,]+)\s*笔交易，原先由\s*(\d+)\s*人每日各\s*(\d+)\s*小时手工对账，一年\s*(\d+)\s*个工作日，合计 \*\*([\d,]+)\s*人时\*\*/);
  if (!manual) throw new Error('正文里找不到人工对账工时');
  const after = doc.match(/人工降为每日\s*([\d.]+)\s*小时复核，一年\s*(\d+)\s*人时。净省\s*([\d,]+)\s*人时，按每人年\s*([\d,]+)\s*工时计，约\s*([\d.]+)\s*个人年/);
  if (!after) throw new Error('正文里找不到自动对账后的工时');
  const miss = doc.match(/字段缺失率\s*([\d.]+)%，即每日 \*\*(\d+)\s*笔\*\*/);
  if (!miss) throw new Error('正文里找不到例外率');
  const prec = doc.match(/\*\*精确率 = (\d+) ÷ ([\d,]+) = ([\d.]+)%。\*\*/);
  if (!prec) throw new Error('正文里找不到精确率');
  const hours = doc.match(/([\d,]+)\s*笔 × 1\.5 分钟 = (\d+) 小时\/月，一年 ([\d,]+) 小时/);
  if (!hours) throw new Error('正文里找不到确认工时');
  const better = doc.match(/命中降到约\s*([\d,]+)\s*笔，确认工时降到\s*(\d+)\s*小时\/月，年\s*(\d+)\s*小时——\*\*省下\s*(\d+)\s*小时/);
  if (!better) throw new Error('正文里找不到优化后的工时');
  return {
    rules: Number(head[1]),
    trades: Number(head[2].replace(/,/g, '')),
    hits: Number(head[3].replace(/,/g, '')),
    hitRate: Number(head[4]),
    real: Number(head[5]),
    fees: Number(map[1].replace(/,/g, '')),
    accounts: Number(map[2]),
    perAccount: Number(map[3]),
    interfacePerDay: Number(manual[1].replace(/,/g, '')),
    people: Number(manual[2]),
    hoursPerDay: Number(manual[3]),
    workdays: Number(manual[4]),
    manualHours: Number(manual[5].replace(/,/g, '')),
    reviewHours: Number(after[1]),
    autoHours: Number(after[2]),
    saved: Number(after[3].replace(/,/g, '')),
    hoursPerYear: Number(after[4].replace(/,/g, '')),
    autoYears: Number(after[5]),
    precisionYears: Number((doc.match(/一年 [\d,]+ 小时，约 ([\d.]+) 个人年/) || [])[1]),
    missRate: Number(miss[1]),
    exceptions: Number(miss[2]),
    hitForPrecision: Number(prec[1]),
    hitsForPrecision: Number(prec[2].replace(/,/g, '')),
    precision: Number(prec[3]),
    confirmHits: Number(hours[1].replace(/,/g, '')),
    minutes: Number(hours[2]),
    hoursYear: Number(hours[3].replace(/,/g, '')),
    betterHits: Number(better[1].replace(/,/g, '')),
    betterHoursMonth: Number(better[2]),
    betterHoursYear: Number(better[3]),
    betterSaved: Number(better[4]),
  };
}

function compute(p) {
  const precision = (p.real / p.hits) * 100;
  const hitRate = (p.hits / p.trades) * 100;
  const falsePositives = p.hits - p.real;
  const confirmMinutes = p.hits * 1.5;
  const perAccount = p.fees / p.accounts;
  const manual = p.people * p.hoursPerDay * p.workdays;
  const auto = p.reviewHours * p.workdays;
  const saved = manual - auto;
  const exceptions = p.interfacePerDay * (p.missRate / 100);
  return {
    precision,
    hitRate,
    falsePositives,
    hoursMonth: confirmMinutes / 60,
    hoursYear: (confirmMinutes / 60) * 12,
    personYears: ((confirmMinutes / 60) * 12) / p.hoursPerYear,
    perAccount,
    manual,
    auto,
    saved,
    personYearsSaved: saved / p.hoursPerYear,
    exceptions,
    betterHits: p.real / 0.5,
    betterHoursMonth: ((p.real / 0.5) * 1.5) / 60,
    betterSaved: p.hoursYear - ((p.real / 0.5) * 1.5 / 60) * 12,
  };
}

const wan = (n) => Math.round(n).toLocaleString('en-US');

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(Math.abs(r.hitRate - p.hitRate) < 0.01 && p.hitRate === 1.03, '命中率 3,720 ÷ 360,000 = 1.03%');
  expect(Math.abs(r.precision - p.precision) < 0.05 && p.precision === 16.7, '精确率 620 ÷ 3,720 = 16.7%');
  expect(r.falsePositives === 3100, '误报 3,100 笔');
  expect(Math.abs(r.hoursMonth - p.minutes) < 1e-9 && p.minutes === 93, '确认工时 93 小时/月');
  expect(Math.round(r.hoursYear) === p.hoursYear && p.hoursYear === 1116, '一年 1,116 小时');
  expect(Math.abs(r.personYears - p.precisionYears) < 0.05 && p.precisionYears === 0.6, '约 0.6 个人年');
  expect(Math.abs(r.perAccount - p.perAccount) < 0.05 && p.perAccount === 22.6, '平均每科目承接 22.6 个项目');
  expect(r.manual === p.manualHours && p.manualHours === 2000, '人工对账 2 × 4 × 250 = 2,000 人时');
  expect(r.auto === p.autoHours && p.autoHours === 125, '自动对账后 0.5 × 250 = 125 人时');
  expect(r.saved === p.saved && p.saved === 1875 && doc.includes('净省 1,875 人时'), '净省 1,875 人时');
  expect(Math.abs(r.personYearsSaved - p.autoYears) < 0.01 && p.autoYears === 1.04, '省下约 1.04 个人年');
  expect(Math.round(r.exceptions) === p.exceptions && p.exceptions === 96, '例外 12,000 × 0.8% = 96 笔');
  expect(Math.round(r.betterHits) === p.betterHits && p.betterHits === 1240, '精确率提到 50% 后命中约 1,240 笔');
  expect(Math.round(r.betterHoursMonth) === p.betterHoursMonth && p.betterHoursMonth === 31, '确认工时降到 31 小时/月');
  expect(Math.round(r.betterSaved) === p.betterSaved && p.betterSaved === 744, '省下 744 小时');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 15 章 六条提示里五条是白看的');
  console.log('');
  console.log(`规则 ${p.rules} 条，月交易 ${wan(p.trades)} 笔，命中 ${wan(p.hits)} 笔（${r.hitRate.toFixed(2)}%）`);
  console.log(`  真问题 ${p.real} 笔、误报 ${wan(r.falsePositives)} 笔 → 精确率 ${r.precision.toFixed(1)}%`);
  console.log(`  确认工时 ${wan(p.hits)} × 1.5 分钟 = ${r.hoursMonth.toFixed(0)} 小时/月，一年 ${wan(r.hoursYear)} 小时（约 ${r.personYears.toFixed(2)} 个人年）`);
  console.log('');
  console.log(`映射：${wan(p.fees)} 个收费项目 ÷ ${p.accounts} 个科目 = ${r.perAccount.toFixed(1)} 个/科目`);
  console.log(`自动对账：${p.people} × ${p.hoursPerDay} × ${p.workdays} = ${wan(r.manual)} 人时 → ${wan(p.autoHours)} 人时，净省 ${wan(r.saved)} 人时（约 ${r.personYearsSaved.toFixed(2)} 个人年）`);
  console.log(`  例外：${wan(p.interfacePerDay)} × ${p.missRate}% = ${wan(r.exceptions)} 笔/日`);
  console.log(`精确率提到 50%：命中约 ${wan(r.betterHits)} 笔，${r.betterHoursMonth.toFixed(0)} 小时/月，年省 ${wan(r.betterSaved)} 小时`);
  console.log('结论：不是提示更多，是提示更准；漏报数不出来，必须留抽样兜底。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 精确率与人时由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成系统选型建议或技术方案。');
}

function wal(n) {
  return Math.round(n).toLocaleString('en-US');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
