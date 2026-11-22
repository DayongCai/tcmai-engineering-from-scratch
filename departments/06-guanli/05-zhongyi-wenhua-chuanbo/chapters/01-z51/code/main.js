#!/usr/bin/env node
/**
 * 中医文化传播 · 第 1 章 先秦到汉唐留下来的是三种说话方式，不是一条族谱
 * 课程: departments/06-guanli/05-zhongyi-wenhua-chuanbo/chapters/01-z51/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章 docs/zh.md 现算：汉字、节、表、加粗判断、引文，
 * 以及正文那张五层文体表的复算——层数、文体是否互不相同、每层的「能证／不能证」两列是否都填满。
 * 表一改，结论跟着变；若两层文体相同，脚本会报「它们本可互证」，那正是本章要否掉的读法。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '先秦到汉唐留下来的是三种说话方式，不是一条族谱';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

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
  return { hanzi, sections, tables, tableCount: tables.length, cites, claims };
}

/**
 * 复算五层文体表：层次数、文体是否两两不同、每层「能证」「不能证」是否都给了内容。
 * 本章的论点正是这三件事必须同时成立——否则「不是一条族谱」就退化成一句口号。
 */
function auditGenreTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('文体')));
  if (!t) throw new Error('正文里没找到文体对照表');
  const idxOf = (kw) => t.header.findIndex((h) => h.includes(kw));
  const li = idxOf('层次');
  const ci = idxOf('文体');
  const cannoti = t.header.findIndex((h) => h.includes('不能证'));
  const cani = t.header.findIndex((h) => h.includes('能证') && h.indexOf('不能证') < 0);
  const rows = t.rows.filter((r) => r[0]);
  const levels = rows.map((r) => r[li]);
  const genres = rows.map((r) => r[ci]);
  const filled = rows.filter((r) => (r[cani] || '').trim() && (r[cannoti] || '').trim()).length;
  return {
    rows: rows.length,
    columns: t.header.length,
    levels,
    genres,
    distinctGenres: new Set(genres).size,
    filled,
  };
}

function verify(t) {
  if (t.rows !== t.distinctGenres) {
    throw new Error(`文体出现重复：${t.rows} 层只有 ${t.distinctGenres} 种文体——它们本可互证，本章论点不成立`);
  }
  if (t.filled !== t.rows) throw new Error(`有 ${t.rows - t.filled} 层没写清能证／不能证，引用硬度无从判断`);
}

function main() {
  const a = analyze(read());
  const g = auditGenreTable(a.tables);
  verify(g);

  console.log(`中医文化传播 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`五层文体表复算：${g.rows} 行 × ${g.columns} 列`);
  console.log(`  层次：${g.levels.join('、')}`);
  console.log(`  文体互不相同：${g.distinctGenres}/${g.rows} → 「不是一条族谱」成立`);
  console.log(`  每层都写明能证与不能证：${g.filled}/${g.rows}`);
  console.log('  同一句「古人有此说」出自不同层，硬度差得很远：寓言当证据是错位，药条当体系也是错位。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, auditGenreTable, verify };
