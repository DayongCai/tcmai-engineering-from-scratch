#!/usr/bin/env node
/**
 * 中医文化传播 · 第 6 章 把中医讲成奇迹，是最快也最贵的一种传播
 * 课程: departments/06-guanli/05-zhongyi-wenhua-chuanbo/chapters/06-z56/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章 docs/zh.md 现算：汉字、节、表、引文，
 * 加上两张表的复算——可译性三概念是否都写了范畴错误与更稳处理；
 * 四种媒介里短视频必然删掉的那一项是不是「全部限定条件」。
 * 另外核对奇观三件套与四类误读是否都在正文出现。本章不编造任何传播量实测值。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '把中医讲成奇迹，是最快也最贵的一种传播';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const SPECTACLE = ['绝症', '神针', '秘方'];
const MISREADS = ['五元素', '善恶二元', '刺激神经', '天然无害'];

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
  const spectacle = SPECTACLE.filter((k) => body.includes(k));
  const misreads = MISREADS.filter((k) => body.includes(k));
  return { hanzi, sections, tables, tableCount: tables.length, cites, claims, spectacle, misreads };
}

/** 复算可译性表：三个概念、每行是否都写了范畴错误与更稳的处理。 */
function auditTranslatability(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('范畴错误')));
  if (!t) throw new Error('正文里没找到可译性表');
  const idxOf = (kw) => t.header.findIndex((h) => h.includes(kw));
  const ci = idxOf('概念');
  const ei = t.header.findIndex((h) => h.includes('范畴错误'));
  const si = t.header.findIndex((h) => h.includes('更稳'));
  const rows = t.rows.filter((r) => r[0]);
  return {
    rows: rows.length,
    columns: t.header.length,
    concepts: rows.map((r) => r[ci]),
    complete: rows.filter((r) => (r[ei] || '').trim() && (r[si] || '').trim()).length,
  };
}

/** 复算媒介表：四种媒介，短视频那一行必然删掉的是什么。 */
function auditMedia(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('媒介')) && x.header.some((h) => h.includes('必然删掉')));
  if (!t) throw new Error('正文里没找到媒介表');
  const mi = t.header.findIndex((h) => h.includes('媒介'));
  const di = t.header.findIndex((h) => h.includes('必然删掉'));
  const rows = t.rows.filter((r) => r[0]);
  const short = rows.find((r) => String(r[mi] || '').includes('短视频')) || null;
  return {
    rows: rows.length,
    columns: t.header.length,
    media: rows.map((r) => r[mi]),
    shortDrop: short ? short[di] : null,
  };
}

function verify(tr, md, a) {
  if (tr.rows !== 3) throw new Error(`可译性表应为 3 行，读到 ${tr.rows}`);
  if (tr.complete !== tr.rows) throw new Error(`有 ${tr.rows - tr.complete} 个概念没写清范畴错误或更稳处理`);
  if (md.rows !== 4) throw new Error(`媒介表应为 4 行，读到 ${md.rows}`);
  if (!md.shortDrop || !md.shortDrop.includes('全部限定条件')) {
    throw new Error(`短视频一行的删减项是「${md.shortDrop}」，与正文「全部限定条件」不符`);
  }
  if (a.spectacle.length !== 3) throw new Error(`奇观三件套只找到 ${a.spectacle.length} 项`);
  if (a.misreads.length !== 4) throw new Error(`四类误读只找到 ${a.misreads.length} 类`);
}

function main() {
  const a = analyze(read());
  const tr = auditTranslatability(a.tables);
  const md = auditMedia(a.tables);
  verify(tr, md, a);

  console.log(`中医文化传播 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`可译性表复算：${tr.rows} 行 × ${tr.columns} 列`);
  console.log(`  概念：${tr.concepts.join('、')}；每个都写了范畴错误与更稳处理：${tr.complete}/${tr.rows}`);
  console.log('  → 宁可留下一个不懂的词，也不给一个会误导的词。');
  console.log('');
  console.log(`媒介表复算：${md.rows} 行 × ${md.columns} 列`);
  console.log(`  媒介：${md.media.join('、')}`);
  console.log(`  短视频必然删掉：${md.shortDrop}`);
  console.log('  → 用短视频讲证的可译性一定失败，因为限定条件装不进去。');
  console.log('');
  console.log(`奇观三件套：${a.spectacle.join('、')}（${a.spectacle.length}/3 在正文出现）`);
  console.log(`四类误读：${a.misreads.join('、')}（${a.misreads.length}/4 在正文出现）`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, SPECTACLE, MISREADS, read, analyze, parseTables, auditTranslatability, auditMedia, verify };
