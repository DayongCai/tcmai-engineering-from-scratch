#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 2 章 一台设备要过三本账
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/02-k2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的「二上二下」与三个执行比率是一组互相闭合的数：一上 9.6 亿、一下 9.2 亿、
 * 批复 9.2 亿，调整率、执行率、结转率都由 92,000 / 4,600 / 96,600 / 93,900 / 2,700 推出。
 * 脚本从正文抓数重算三个比率，再与正文印出的百分数对账。
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
    askBillion: num(/预算建议数\s*([\d.]+)\s*亿元/, '一上预算建议数'),
    controlBillion: num(/控制数\s*([\d.]+)\s*亿元/, '一下控制数'),
    cutWan: num(/压缩\s*([\d,]+)\s*万元/, '压缩额'),
    extra: num(/追加预算\s*([\d,]+)\s*÷/, '追加预算'),
    yearStart: num(/年初预算\s*([\d,]+)\s*\|/, '年初预算'),
    actual: num(/实际支出\s*([\d,]+)\s*÷/, '实际支出'),
    adjusted: num(/调整后预算\s*([\d,]+)\s*\|/, '调整后预算'),
    carry: num(/结转下年\s*([\d,]+)\s*÷/, '结转下年'),
    device: num(/一台\s*([\d,]+)\s*万元的磁共振/, '设备原值'),
  };
}

function compute(p) {
  const askWan = p.askBillion * 10000;
  const controlWan = p.controlBillion * 10000;
  return {
    askWan,
    controlWan,
    askCut: askWan - controlWan,
    adjustRate: (p.extra / p.yearStart) * 100,
    execRate: (p.actual / p.adjusted) * 100,
    carryRate: (p.carry / p.adjusted) * 100,
    depYear: p.device / 8,
  };
}

const pct = (x) => `${x.toFixed(1)}%`;
const wan = (n) => n.toLocaleString('en-US');

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.askWan === 96000 && r.controlWan === 92000, '一上 9.6 亿元 = 96,000 万元，一下 9.2 亿元 = 92,000 万元');
  expect(r.askCut === 4000 && p.cutWan === 4000, '一上与一下相差 4,000 万元，与正文压缩额一致');
  expect(r.controlWan === p.yearStart && doc.includes('批复预算 9.2 亿元'), '批复预算等于控制数 92,000 万元');
  expect(doc.includes('5.0%') && Math.abs(r.adjustRate - 5.0) < 0.05, '调整率 4,600 ÷ 92,000 = 5.0%');
  expect(doc.includes('97.2%') && Math.abs(r.execRate - 97.2) < 0.05, '执行率 93,900 ÷ 96,600 = 97.2%');
  expect(doc.includes('2.8%') && Math.abs(r.carryRate - 2.8) < 0.05, '结转率 2,700 ÷ 96,600 = 2.8%');
  expect(r.depYear === 150 && doc.includes('当年只进 150 万元费用'), '设备 1,200 ÷ 8 = 年折旧 150 万元');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 2 章 一台设备要过三本账');
  console.log('');
  console.log(`二上二下（万元）：一上 ${wan(r.askWan)} → 一下 ${wan(r.controlWan)}，压缩 ${wan(r.askCut)}；批复 ${wan(p.yearStart)}`);
  console.log('');
  console.log('三个执行比率：');
  console.log(`  调整率　${wan(p.extra)} ÷ ${wan(p.yearStart)} = ${pct(r.adjustRate)}　（预见性）`);
  console.log(`  执行率　${wan(p.actual)} ÷ ${wan(p.adjusted)} = ${pct(r.execRate)}　（节奏）`);
  console.log(`  结转率　${wan(p.carry)} ÷ ${wan(p.adjusted)} = ${pct(r.carryRate)}　（未花完的部分）`);
  console.log('');
  console.log(`同一台 ${wan(p.device)} 万元设备：预算当年列 ${wan(p.device)} 万元支出，会计每年只进 ${wan(r.depYear)} 万元费用。`);
  console.log('结论：三个数都没有错，错的是以为只有一本账。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 比率由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成法律意见或合规认定。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
