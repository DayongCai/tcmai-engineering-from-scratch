#!/usr/bin/env node
/**
 * 中医文化传播 · 第 4 章 典籍变不成资源，除非先被切成一格一格
 * 课程: departments/06-guanli/05-zhongyi-wenhua-chuanbo/chapters/04-z54/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章 docs/zh.md 现算：汉字、节、表、引文，
 * 加上那张三种「可查」层级表的复算（三层是哪些、能按结构统计的只有哪一层），
 * 以及正文那条青蒿记载的字数复算（正文说「不到二十个字」，这里数一遍）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '典籍变不成资源，除非先被切成一格一格';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const ERRORS = ['光学识别', '分词', '断句', '版本'];

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
  const errorKinds = ERRORS.filter((k) => body.includes(k));
  return { hanzi, sections, tables, tableCount: tables.length, cites, claims, errorKinds };
}

/** 复算三种「可查」层级表：三层是哪些、每层的能力是否都填了。 */
function auditReadability(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('层级')) && x.header.some((h) => h.includes('能力')));
  if (!t) throw new Error('正文里没找到「可查」层级表');
  const idxOf = (kw) => t.header.findIndex((h) => h.includes(kw));
  const li = idxOf('层级');
  const ai = idxOf('能力');
  const rows = t.rows.filter((r) => r[0]);
  return {
    rows: rows.length,
    columns: t.header.length,
    levels: rows.map((r) => r[li]),
    abilitiesFilled: rows.filter((r) => (r[ai] || '').trim()).length,
    top: rows[rows.length - 1] ? rows[rows.length - 1][li] : null,
  };
}

/** 数一数正文里那条青蒿记载的字数，用来核对「不到二十个字」。 */
function auditQinghao(body) {
  const m = body.match(/青蒿一握[^\n。]*/);
  if (!m) throw new Error('正文里没找到青蒿那条记载');
  return { text: m[0].trim(), hanzi: (m[0].match(HANZI) || []).length };
}

function verify(r, q) {
  if (r.rows !== 3) throw new Error(`层级表应为 3 行，读到 ${r.rows}`);
  if (q.hanzi >= 20) throw new Error(`青蒿记载 ${q.hanzi} 字，与正文「不到二十个字」不符`);
}

function main() {
  const a = analyze(read());
  const r = auditReadability(a.tables);
  const q = auditQinghao(read());
  verify(r, q);

  console.log(`中医文化传播 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`三种「可查」层级表复算：${r.rows} 行 × ${r.columns} 列`);
  console.log(`  层级：${r.levels.join('、')}；能按结构统计的只有最上一层「${r.top}」`);
  console.log(`  每层能力都写明：${r.abilitiesFilled}/${r.rows}`);
  console.log(`青蒿那条记载复算：${q.hanzi} 个汉字（正文说「不到二十个字」）`);
  console.log('  它短、它独立、它带主治关键词，所以能被检索、被完整引用而不丢条件。');
  console.log(`检索失真四类错法：${a.errorKinds.join('、')}（${a.errorKinds.length}/${ERRORS.length} 在正文出现）`);
  console.log('  → 共同特点：不报错，只会安静地返回一个偏小的结果集。');
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

module.exports = { DOC, CHAPTER, TITLE, ERRORS, read, analyze, parseTables, auditReadability, auditQinghao, verify };
