#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 18 章 门禁查得出形式，查不出判断
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/18-k18/docs/zh.md
 * 数据: standards/23-yiyuan-kuaiji-caiwu/units.json（198 单元，每单元带章号与汉字数）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字不是演算设定，而是仓内真源。脚本从 units.json 现算章数、单元数、
 * 汉字总数与章分布，再与正文所写的数逐项比对：对不上的地方打印出来，不静默放过。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', '23-yiyuan-kuaiji-caiwu', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/23-yiyuan-kuaiji-caiwu/units.json —— 章节目录是否已脱离仓库？');
}

const UNITS_PATH = path.join(findRoot(__dirname), 'standards', '23-yiyuan-kuaiji-caiwu', 'units.json');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function loadUnits() {
  return JSON.parse(fs.readFileSync(UNITS_PATH, 'utf8'));
}

/** 从单元层现算：章数、单元数、汉字总数、每章分布 */
function summarize(units) {
  const per = {};
  let hanzi = 0;
  for (const u of units) {
    per[u.chapter] = (per[u.chapter] || 0) + (u.hanzi || 0);
    hanzi += u.hanzi || 0;
  }
  const chapters = Object.keys(per).length;
  const counts = {};
  for (const u of units) counts[u.chapter] = (counts[u.chapter] || 0) + 1;
  const values = Object.values(per);
  return {
    chapters,
    units: units.length,
    hanzi,
    perUnit: hanzi / units.length,
    minChapter: Math.min(...values),
    maxChapter: Math.max(...values),
    spread: Math.max(...values) - Math.min(...values),
    spreadRate: ((Math.max(...values) - Math.min(...values)) / Math.min(...values)) * 100,
    unitsPerChapter: new Set(Object.values(counts)).size === 1 ? Object.values(counts)[0] : null,
    perChapter: per,
  };
}

/** 正文所写的数（用于比对）；取不到就记一条缺口 */
function docClaims(doc) {
  const grab = (re) => {
    const m = doc.match(re);
    return m ? m[1] : null;
  };
  return {
    chapters: Number(grab(/(\d+)\s*章、\s*\d+\s*个单元/)),
    units: Number(grab(/\d+\s*章、\s*(\d+)\s*个单元/)),
    hanzi: Number((grab(/([\d,]+)\s*汉字/) || '').replace(/,/g, '')),
    perUnit: Number((grab(/平均每个单元\s*([\d,]+)\s*字/) || '').replace(/,/g, '')),
    rangeLow: Number((grab(/每章汉字数在\s*([\d,]+)\s*到/) || '').replace(/,/g, '')),
    rangeHigh: Number((grab(/每章汉字数在\s*[\d,]+\s*到\s*([\d,]+)\s*之间/) || '').replace(/,/g, '')),
    spread: Number((grab(/极差\s*([\d,]+)\s*字/) || '').replace(/,/g, '')),
  };
}

/** 真源 vs 正文：返回不一致项（不抛错，逐条打印，供作者回改） */
function reconcile(doc, s) {
  const c = docClaims(doc);
  const out = [];
  const cmp = (label, stated, actual, tol = 0) => {
    if (stated === null || Number.isNaN(stated)) { out.push(`${label}：正文未写明，无法比对`); return; }
    if (Math.abs(stated - actual) > tol) {
      out.push(`${label}：正文记 ${stated.toLocaleString('en-US')}，现算 ${actual.toLocaleString('en-US', { maximumFractionDigits: 1 })}`);
    }
  };
  cmp('章数', c.chapters, s.chapters);
  cmp('单元数', c.units, s.units);
  cmp('汉字总数', c.hanzi, s.hanzi);
  cmp('每单元平均字', c.perUnit, Math.round(s.perUnit));
  cmp('章汉字下限', c.rangeLow, s.minChapter);
  cmp('章汉字上限', c.rangeHigh, s.maxChapter);
  cmp('章间极差', c.spread, s.spread);
  return { claims: c, mismatches: out };
}

function main() {
  const doc = readDoc();
  const all = loadUnits();
  const s = summarize(all.units);
  const r = reconcile(doc, s);

  console.log('医院会计与财务管理 · 第 18 章 门禁查得出形式，查不出判断');
  console.log('');
  console.log(`数据源：standards/23-yiyuan-kuaiji-caiwu/units.json`);
  console.log(`现算：${s.chapters} 章、${s.units} 单元、${s.hanzi.toLocaleString('en-US')} 汉字`);
  console.log(`  每单元平均 ${s.perUnit.toFixed(1)} 字；每章单元数 ${s.unitsPerChapter === null ? '不齐' : s.unitsPerChapter}`);
  console.log(`  章汉字区间 ${s.minChapter.toLocaleString('en-US')} — ${s.maxChapter.toLocaleString('en-US')}，极差 ${s.spread.toLocaleString('en-US')} 字（${s.spreadRate.toFixed(1)}%）`);
  console.log('');
  console.log('与正文比对：');
  if (!r.mismatches.length) console.log('   ✓ 正文所列各数与数据源一致');
  for (const line of r.mismatches) console.log(`   ! ${line}`);
  console.log('');
  console.log('结论：能自动查的是结构，不能自动查的是判断；数字对不上时，先改数，再谈结论。');
  console.log('※ 本章数字来自仓内真源（units.json），不是演算设定。');
  console.log('※ 教学示意，不构成技术方案或数据合规结论。');
}

if (require.main === module) main();

module.exports = { readDoc, loadUnits, summarize, docClaims, reconcile, DOC_PATH, UNITS_PATH };
