#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 16 章 一个数三个答案
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/16-k16/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的床日四数、三种算法与 320/74 个指标都可复算。脚本从正文抓数，
 * 重算三个使用率与口径分歧占比，再与正文印出的百分数对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function parseParams(doc) {
  const bed = doc.match(/实际占用总床日\s*([\d,]+)，实际开放总床日\s*([\d,]+)（平均开放\s*(\d+)\s*床 × 365），编制床日\s*([\d,]+)（(\d+)\s*床 × 365），出院者占用床日\s*([\d,]+)/);
  if (!bed) throw new Error('正文里找不到四个床日数');
  const ind = doc.match(/这家医院的指标共有\s*(\d+)\s*个，其中\s*(\d+)\s*个（([\d.]+)%）存在两个以上口径/);
  if (!ind) throw new Error('正文里找不到指标口径分歧');
  const units = doc.match(/财务核算单元 \*\*([\d,]+)\s*个\*\*，HIS 开单科室 \*\*([\d,]+)\s*个\*\*，人事编制科室 \*\*([\d,]+)\s*个\*\*/);
  if (!units) throw new Error('正文里找不到三套科室口径');
  const rows = (name) => {
    const m = doc.match(new RegExp(`\\|\\s*${name}\\s*\\|\\s*([\\d,]+)\\s*\\|\\s*([\\d,]+)\\s*\\|\\s*\\**([\\d.]+)%\\**`));
    if (!m) throw new Error(`正文里找不到${name}行`);
    return { num: Number(m[1].replace(/,/g, '')), den: Number(m[2].replace(/,/g, '')), value: Number(m[3]) };
  };
  return {
    occupied: Number(bed[1].replace(/,/g, '')),
    openBeds365: Number(bed[2].replace(/,/g, '')),
    openBeds: Number(bed[3]),
    authorized365: Number(bed[4].replace(/,/g, '')),
    authorizedBeds: Number(bed[5]),
    discharged: Number(bed[6].replace(/,/g, '')),
    indicators: Number(ind[1]),
    variantIndicators: Number(ind[2]),
    variantRate: Number(ind[3]),
    finUnits: Number(units[1].replace(/,/g, '')),
    hisUnits: Number(units[2].replace(/,/g, '')),
    hrUnits: Number(units[3].replace(/,/g, '')),
    rowOpen: rows('按实际开放床日'),
    rowAuthorized: rows('按编制床日'),
    rowDischarged: rows('按出院者占用床日'),
  };
}

function compute(p) {
  const open = (p.occupied / p.openBeds365) * 100;
  const authorized = (p.occupied / p.authorized365) * 100;
  const discharged = (p.discharged / p.openBeds365) * 100;
  return {
    open,
    authorized,
    discharged,
    spread: Math.max(open, authorized, discharged) - Math.min(open, authorized, discharged),
    variantRate: (p.variantIndicators / p.indicators) * 100,
    bedsCheck: p.openBeds * 365 === p.openBeds365,
    authCheck: p.authorizedBeds * 365 === p.authorized365,
  };
}

const pct = (x) => `${x.toFixed(1)}%`;

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(r.bedsCheck, '平均开放 760 床 × 365 = 277,400 床日');
  expect(r.authCheck, '编制 800 床 × 365 = 292,000 床日');
  expect(Math.abs(r.open - p.rowOpen.value) < 0.05 && p.rowOpen.value === 75.7, '按实际开放床日 75.7%');
  expect(Math.abs(r.authorized - p.rowAuthorized.value) < 0.05 && p.rowAuthorized.value === 71.9, '按编制床日 71.9%');
  expect(Math.abs(r.discharged - p.rowDischarged.value) < 0.05 && p.rowDischarged.value === 71.4, '按出院者占用床日 71.4%');
  expect(Math.abs(r.spread - 4.3) < 0.06 && doc.includes('4.3 个百分点'), '最高与最低相差 4.3 个百分点');
  expect(Math.abs(r.variantRate - p.variantRate) < 0.06 && p.variantRate === 23.1, '74 ÷ 320 = 23.1% 的指标存在两个以上口径');
  expect(p.finUnits === 186 && p.hisUnits === 214 && p.hrUnits === 92, '三套科室口径 186 / 214 / 92');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 16 章 一个数三个答案');
  console.log('');
  console.log(`床日：实际占用 ${p.occupied.toLocaleString('en-US')}、实际开放 ${p.openBeds365.toLocaleString('en-US')}（${p.openBeds} × 365）、编制 ${p.authorized365.toLocaleString('en-US')}（${p.authorizedBeds} × 365）、出院者占用 ${p.discharged.toLocaleString('en-US')}`);
  console.log('');
  console.log('三种算法：');
  console.log(`  按实际开放床日　${p.rowOpen.num.toLocaleString('en-US')} ÷ ${p.rowOpen.den.toLocaleString('en-US')} = ${pct(r.open)}`);
  console.log(`  按编制床日　　　${p.rowAuthorized.num.toLocaleString('en-US')} ÷ ${p.rowAuthorized.den.toLocaleString('en-US')} = ${pct(r.authorized)}`);
  console.log(`  按出院者占用　　${p.rowDischarged.num.toLocaleString('en-US')} ÷ ${p.rowDischarged.den.toLocaleString('en-US')} = ${pct(r.discharged)}`);
  console.log(`  口径分歧　　　　${r.spread.toFixed(1)} 个百分点（足以支撑两个相反结论）`);
  console.log('');
  console.log(`指标 ${p.indicators} 个，其中 ${p.variantIndicators} 个（${pct(r.variantRate)}）存在两个以上口径`);
  console.log(`科室口径三套：财务核算单元 ${p.finUnits}、HIS 开单 ${p.hisUnits}、人事编制 ${p.hrUnits}`);
  console.log('结论：名字带上口径，两个数才不会互相否定。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 三个使用率由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成统计口径的官方解释。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
