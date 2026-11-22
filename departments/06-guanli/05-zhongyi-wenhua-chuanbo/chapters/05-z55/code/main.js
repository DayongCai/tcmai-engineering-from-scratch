#!/usr/bin/env node
/**
 * 中医文化传播 · 第 5 章 传播的底线不是说得动人，是说得住回查
 * 课程: departments/06-guanli/05-zhongyi-wenhua-chuanbo/chapters/05-z55/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章 docs/zh.md 现算：汉字、节、表、引文，
 * 加上两张表的复算——三类失真各配了检查问句与补救动作没有，四项指标是否齐全；
 * 以及三级表述（述而不评／述而有限／述而主张）是否都在正文出现。
 * 本章自述「不给任何实测数字」，脚本照此只复算结构与口径，不生成任何传播量数值。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '传播的底线不是说得动人，是说得住回查';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const GRADES = ['述而不评', '述而有限', '述而主张'];
const METRICS = ['可核率', '复述准确率', '误读率', '行为指向'];

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
  const grades = GRADES.filter((g) => body.includes(g));
  const noNumbers = body.includes('不给任何实测数字');
  return { hanzi, sections, tables, tableCount: tables.length, cites, claims, grades, noNumbers };
}

/** 复算三类失真表：类型、每行是否都配了检查问句与补救动作。 */
function auditFailureTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('失真类型')));
  if (!t) throw new Error('正文里没找到三类失真表');
  const idxOf = (kw) => t.header.findIndex((h) => h.includes(kw));
  const ti = idxOf('失真类型');
  const qi = t.header.findIndex((h) => h.includes('检查问句'));
  const ai = t.header.findIndex((h) => h.includes('补救'));
  const rows = t.rows.filter((r) => r[0]);
  return {
    rows: rows.length,
    columns: t.header.length,
    types: rows.map((r) => r[ti]),
    complete: rows.filter((r) => (r[qi] || '').trim() && (r[ai] || '').trim()).length,
  };
}

/** 复算四项指标表：指标名与列数。 */
function auditMetricTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('指标')) && x.header.some((h) => h.includes('怎么测')));
  if (!t) throw new Error('正文里没找到四项指标表');
  const ii = t.header.findIndex((h) => h.includes('指标'));
  const rows = t.rows.filter((r) => r[0]);
  return { rows: rows.length, columns: t.header.length, metrics: rows.map((r) => r[ii]) };
}

function verify(f, m, a) {
  if (f.rows !== 3) throw new Error(`失真表应为 3 行，读到 ${f.rows}`);
  if (f.complete !== f.rows) throw new Error(`有 ${f.rows - f.complete} 类失真没配齐检查问句或补救动作`);
  if (m.rows !== 4) throw new Error(`指标表应为 4 行，读到 ${m.rows}`);
  if (a.grades.length !== 3) throw new Error(`三级表述只找到 ${a.grades.length} 级`);
  if (!a.noNumbers) throw new Error('正文缺「不给任何实测数字」的边界声明');
}

function main() {
  const a = analyze(read());
  const f = auditFailureTable(a.tables);
  const m = auditMetricTable(a.tables);
  verify(f, m, a);

  console.log(`中医文化传播 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`三类失真表复算：${f.rows} 行 × ${f.columns} 列`);
  console.log(`  失真类型：${f.types.join('、')}；每类都配齐检查问句与补救动作：${f.complete}/${f.rows}`);
  console.log('');
  console.log(`四项指标表复算：${m.rows} 行 × ${m.columns} 列`);
  console.log(`  指标：${m.metrics.join('、')}`);
  console.log(`三级表述：${a.grades.join('、')}（${a.grades.length}/3）`);
  console.log(`  → 指标只测传播质量，不替代医学正确性；正文自述${a.noNumbers ? '不给任何实测数字。' : '（缺实测数字声明）。'}`);
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

module.exports = { DOC, CHAPTER, TITLE, GRADES, METRICS, read, analyze, parseTables, auditFailureTable, auditMetricTable, verify };
