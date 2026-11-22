#!/usr/bin/env node
/**
 * 中医文化传播 · 第 3 章 制度化救下的是编制与课表，不是可传播性
 * 课程: departments/06-guanli/05-zhongyi-wenhua-chuanbo/chapters/03-z53/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章 docs/zh.md 现算：汉字、节、表、引文，以及正文可核年份的出现，
 * 再加上那张四期载体表的复算——传播单位是否期期不同、每期是否都写明了被筛掉的东西。
 * 表一改，结论跟着变；若两期传播单位相同，脚本会报「换载体未换筛选口径」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '制度化救下的是编制与课表，不是可传播性';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const YEARS = ['1912', '1929', '1956', '2016'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** Markdown 表格切成 { header, rows }；分隔行不计。 */
function parseTables(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\|(.+)\|\s*$/);
    if (!m) { cur = null; continue; }
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); } else { cur.rows.push(cells); }
  }
  return out;
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], hanzi: 0 }; sections.push(cur); continue; }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }
  const tables = parseTables(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const years = YEARS.filter((y) => body.includes(y));
  return { hanzi, sections, tables, tableCount: tables.length, cites, claims, years };
}

/**
 * 复算四期载体表：期数、传播单位是否期期不同、每期是否都写明了被筛掉的东西。
 * 本章论点是「换一次载体，筛一次内容」，若两期传播单位相同，这条线就断了。
 */
function auditCarrierTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('传播单位')));
  if (!t) throw new Error('正文里没找到载体更替表');
  const idxOf = (kw) => t.header.findIndex((h) => h.includes(kw));
  const pi = idxOf('时期');
  const ui = idxOf('传播单位');
  const fi = t.header.findIndex((h) => h.includes('筛掉'));
  const rows = t.rows.filter((r) => r[0]);
  const periods = rows.map((r) => r[pi]);
  const units = rows.map((r) => r[ui]);
  const filtered = rows.filter((r) => (r[fi] || '').trim()).length;
  return {
    rows: rows.length,
    columns: t.header.length,
    periods,
    units,
    distinctUnits: new Set(units).size,
    filtered,
  };
}

function verify(g) {
  if (g.distinctUnits !== g.rows) {
    throw new Error(`${g.rows} 期只有 ${g.distinctUnits} 种传播单位——换载体未换筛选口径，正文论点不成立`);
  }
  if (g.filtered !== g.rows) throw new Error(`有 ${g.rows - g.filtered} 期没写明被筛掉的东西`);
}

function main() {
  const a = analyze(read());
  const g = auditCarrierTable(a.tables);
  verify(g);

  console.log(`中医文化传播 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`四期载体表复算：${g.rows} 行 × ${g.columns} 列`);
  console.log(`  时期：${g.periods.join('、')}`);
  console.log(`  传播单位期期不同：${g.distinctUnits}/${g.rows}`);
  console.log(`  每期都写明被筛掉的东西：${g.filtered}/${g.rows}`);
  console.log(`  正文出现可核年份 ${a.years.length} 个：${a.years.join('、')}`);
  console.log('  → 换一次载体，筛一次内容；筛掉的东西不报错，只是不再出现。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成合规或诊疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, YEARS, read, analyze, parseTables, auditCarrierTable, verify };
