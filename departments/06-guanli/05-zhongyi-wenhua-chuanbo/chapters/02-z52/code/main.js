#!/usr/bin/env node
/**
 * 中医文化传播 · 第 2 章 能传走的是判据，不是神医
 * 课程: departments/06-guanli/05-zhongyi-wenhua-chuanbo/chapters/02-z52/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章 docs/zh.md 现算：汉字、节、表、引文，
 * 以及正文那张四类颗粒表的复算——哪种颗粒传播半径最大、哪种留存期最长、判据落在哪一档。
 * 表一改，结论跟着变；若最大半径与最长留存不是同一种，脚本会报不一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '能传走的是判据，不是神医';
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
 * 复算四类颗粒表：哪种颗粒传播半径最大、哪种留存期最长、判据的半径落在哪一档。
 * 本章的核心判断是「方传得最远也最容易被讲坏」「判据最该传却最难传」，
 * 这两句都得能从表里读出来，读不出来就是表与文字脱节。
 */
function auditGranuleTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('颗粒')));
  if (!t) throw new Error('正文里没找到四类颗粒表');
  const idxOf = (kw) => t.header.findIndex((h) => h.includes(kw));
  const ni = idxOf('颗粒');
  const ri = idxOf('传播半径');
  const ki = idxOf('留存期');
  const rows = t.rows.filter((r) => r[0]);
  const list = rows.map((r) => ({ name: r[ni], radius: r[ri], keep: r[ki] }));
  const widest = list.find((x) => x.radius.includes('最大')) || null;
  const longest = list.find((x) => x.keep.includes('最长')) || null;
  const criteria = list.find((x) => x.name.includes('判据')) || null;
  return { rows: rows.length, columns: t.header.length, list, widest, longest, criteria };
}

function verify(g) {
  if (!g.widest || !g.longest) throw new Error('表里没有标出「最大」「最长」，颗粒表缺判据');
  if (g.widest.name !== g.longest.name) {
    throw new Error(`半径最大的是 ${g.widest.name}，留存最长的是 ${g.longest.name}——与「方传得最远」的正文不一致`);
  }
  if (!g.criteria) throw new Error('表里没有「判据」这一行，本章主线缺失');
}

function main() {
  const a = analyze(read());
  const g = auditGranuleTable(a.tables);
  verify(g);

  console.log(`中医文化传播 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`四类颗粒表复算：${g.rows} 行 × ${g.columns} 列`);
  console.log(`  颗粒：${g.list.map((x) => x.name).join('、')}`);
  console.log(`  传播半径最大：${g.widest.name}（${g.widest.radius}）；留存期最长：${g.longest.name}（${g.longest.keep}）`);
  console.log(`  → 方传得最远也最久，所以最容易被讲坏：三步丢完只剩名字。`);
  console.log(`  判据的传播半径：${g.criteria.radius}（留存 ${g.criteria.keep}）——最该传，却必须连条件一起走。`);
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

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, auditGranuleTable, verify };
