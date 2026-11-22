#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 8 章 成本核算的本质是分摊
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/08-k8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文给了三级分摊的完整算例与一张基数敏感性表。脚本从正文抓出四类科室直接成本、
 * 两个分摊比例与内科占比，逐级重算分摊链，再验证 16,800 与 312 万元两个结果。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function parseParams(doc) {
  const row = (label) => {
    const m = doc.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*([\\d,]+)`));
    if (!m) throw new Error(`正文里找不到${label}的直接成本`);
    return Number(m[1].replace(/,/g, ''));
  };
  const ratio = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    return m[1].split(':').map(Number);
  };
  const sens = (label) => {
    const m = doc.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*([\\d.]+)%\\s*\\|\\s*([\\d,]+)\\s*\\|\\s*([\\d,]+)`));
    if (!m) throw new Error(`正文里找不到按${label}的敏感性行`);
    return {
      share: Number(m[1]),
      indirect: Number(m[2].replace(/,/g, '')),
      total: Number(m[3].replace(/,/g, '')),
    };
  };
  const pool = doc.match(/复算：([\d,]+) × 26\.9%/);
  if (!pool) throw new Error('正文里找不到分摊成本池');
  return {
    admin: row('行政后勤'),
    aux: row('医疗辅助'),
    tech: row('医疗技术'),
    clinic: row('临床服务'),
    adminRatio: ratio(/按人员数比例\s*([\d:]+)/, '人员数比例'),
    auxRatio: ratio(/按服务量比例\s*([\d:]+)/, '服务量比例'),
    pool: Number(pool[1].replace(/,/g, '')),
    byHead: sens('按人员数'),
    byRevenue: sens('按收入'),
  };
}

function compute(p) {
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const adminTotal = sum(p.adminRatio);
  const toAux1 = (p.admin * p.adminRatio[0]) / adminTotal;
  const toTech1 = (p.admin * p.adminRatio[1]) / adminTotal;
  const toClinic1 = (p.admin * p.adminRatio[2]) / adminTotal;
  const auxTotal = p.aux + toAux1;
  const auxSum = sum(p.auxRatio);
  const toTech2 = (auxTotal * p.auxRatio[0]) / auxSum;
  const toClinic2 = (auxTotal * p.auxRatio[1]) / auxSum;
  const techTotal = p.tech + toTech1 + toTech2;
  const clinicTotal = p.clinic + toClinic1 + toClinic2 + techTotal;
  const headIndirect = (p.pool * p.byHead.share) / 100;
  const revIndirect = (p.pool * p.byRevenue.share) / 100;
  return {
    toAux1, toTech1, toClinic1,
    auxTotal, toTech2, toClinic2, techTotal, clinicTotal,
    headIndirect, revIndirect,
    diff: headIndirect - revIndirect,
    diffRate: ((headIndirect - revIndirect) / p.byRevenue.total) * 100,
    poolMatches: p.admin + p.aux + p.tech === p.pool,
  };
}

const wan = (n) => (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.poolMatches, '三类间接成本 2,400 + 1,800 + 3,600 = 7,800 万元');
  expect(Math.round(r.toAux1) === 480 && Math.round(r.toTech1) === 720 && Math.round(r.toClinic1) === 1200,
    '一级分摊 2,400 → 480 / 720 / 1,200');
  expect(Math.round(r.auxTotal) === 2280 && doc.includes('2,280 = 1,800 + 480'), '二级基数 2,280 万元');
  expect(Math.round(r.toTech2) === 684 && Math.round(r.toClinic2) === 1596, '二级分摊 2,280 → 684 / 1,596');
  expect(Math.round(r.techTotal) === 5004 && doc.includes('5,004 = 3,600 + 720 + 684'), '三级基数 5,004 万元');
  expect(r.clinicTotal === 16800 && doc.includes('16,800 = 9,000 + 1,200 + 1,596 + 5,004'), '临床总成本 16,800 万元');
  expect(Math.round(r.headIndirect) === 2098 && Math.round(r.revIndirect) === 1786, '两种基数的内科间接成本 2,098 / 1,786');
  expect(Math.round(r.diff) === 312 && doc.includes('**312**'), '差额 312 万元');
  expect(Math.abs(r.diffRate - 8.7) < 0.06 && doc.includes('8.7%'), '差额占 8.7%');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 8 章 成本核算的本质是分摊');
  console.log('');
  console.log(`直接成本（万元）：行政后勤 ${wan(p.admin)}、医疗辅助 ${wan(p.aux)}、医疗技术 ${wan(p.tech)}、临床 ${wan(p.clinic)}`);
  console.log('');
  console.log('三级分摊：');
  console.log(`  一级　${wan(p.admin)} × ${p.adminRatio.join(':')} → 医辅 ${wan(r.toAux1)}、医技 ${wan(r.toTech1)}、临床 ${wan(r.toClinic1)}`);
  console.log(`  二级　${wan(r.auxTotal)} × ${p.auxRatio.join(':')} → 医技 ${wan(r.toTech2)}、临床 ${wan(r.toClinic2)}`);
  console.log(`  三级　${wan(r.techTotal)} 全部转入临床`);
  console.log(`  临床总成本 = ${wan(p.clinic)} + ${wan(r.toClinic1)} + ${wan(r.toClinic2)} + ${wan(r.techTotal)} = ${wan(r.clinicTotal)}`);
  console.log('');
  console.log(`基数敏感性（分摊池 ${wan(p.pool)} 万元）：`);
  console.log(`  按人员 ${p.byHead.share}% → ${wan(r.headIndirect)} 万元，总成本 ${wan(p.byHead.total)}`);
  console.log(`  按收入 ${p.byRevenue.share}% → ${wan(r.revIndirect)} 万元，总成本 ${wan(p.byRevenue.total)}`);
  console.log(`  差 ${wan(r.diff)} 万元（${r.diffRate.toFixed(1)}%）—— 同一个科室，换基数就换结论`);
  console.log('结论：分摊基数不是技术细节，是结论本身。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 分摊链由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成价格测算结论或绩效分配方案。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
