#!/usr/bin/env node
/**
 * 护理综合技能 · 第 11 章 中医护理技能的边界，比它的手法更需要被写清楚
 * 课程: departments/05-huli/18-huli-zonghe-jineng/chapters/11-ch11/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 不诊断、不立法、不替代；感受是参数，不是配合度。
 * 本章的数字全部从 docs/zh.md 现算：汉字、节、表、扣分档条数，
 * 以及本章各结构项（核对项、步骤段、观察维、记录列等）的实际条数。
 * 手打的数字会在正文改版后静默过期，所以一行都不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '中医护理技能的边界，比它的手法更需要被写清楚';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 二级标题（## ）——本章的「节」 */
function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 把所有连续的表格行切成一张张表（含表头与分隔行） */
function tables(text) {
  const out = [];
  let cur = null;
  for (const line of String(text || '').split('\n')) {
    if (/^\s*\|/.test(line)) {
      if (!cur) { cur = []; out.push(cur); }
      cur.push(line);
    } else {
      cur = null;
    }
  }
  return out;
}

const isSep = (line) => /^\s*\|[\s:|-]+\|\s*$/.test(line);
const cells = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((s) => s.trim());

/** 表体行数：去掉表头与分隔行 */
function bodyRows(t) {
  return t.slice(1).filter((l) => !isSep(l)).length;
}

/** 表头含关键词的第一张表的表体行数 */
function rowsIn(text, kw) {
  for (const t of tables(text)) {
    if (cells(t[0]).some((h) => h.includes(kw))) return bodyRows(t);
  }
  return 0;
}

/** 扣分档条数：表头含「扣分」的表，其数据行之和 */
function scoreRows(text) {
  const rows = [];
  for (const t of tables(text)) {
    if (!cells(t[0]).some((h) => h.includes('扣分'))) continue;
    for (const line of t.slice(1)) {
      if (!isSep(line)) rows.push(cells(line));
    }
  }
  return rows;
}

/** 某个二级标题下的正文行 */
function sectionLines(text, kw) {
  const out = [];
  let on = false;
  for (const line of String(text || '').split('\n')) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) { on = m[1].includes(kw); continue; }
    if (on) out.push(line);
  }
  return out;
}

/** 某节里编号列表的条目数 */
function numberedIn(text, kw) {
  return sectionLines(text, kw).filter((l) => /^\s*\d+\.\s+/.test(l)).length;
}

/** 某节里「- **小标题**」形式的条目数 */
function bulletsIn(text, kw) {
  return sectionLines(text, kw).filter((l) => /^-\s+\*\*/.test(l.trim())).length;
}

const CONCEPTS = [
  [
    "三个不",
    "number",
    "三个「不」"
  ],
  [
    "评估四项",
    "rows",
    "不通过的处置"
  ],
  [
    "骨架四段",
    "rows",
    "时限"
  ],
  [
    "观察五维",
    "number",
    "皮肤与不适"
  ],
  [
    "评分七维",
    "score",
    null
  ],
  [
    "失效四类",
    "present",
    [
      "边界用语失控",
      "手感替代依据",
      "耐受误读",
      "观察单维"
    ]
  ]
];

function conceptStats(text) {
  const out = {};
  for (const [label, kind, arg] of CONCEPTS) {
    if (kind === 'rows') out[label] = rowsIn(text, arg);
    else if (kind === 'score') out[label] = scoreRows(text).length;
    else if (kind === 'number') out[label] = numberedIn(text, arg);
    else if (kind === 'bullets') out[label] = bulletsIn(text, arg);
    else out[label] = arg.filter((x) => text.includes(x)).length;
  }
  return out;
}

function stats(text) {
  return {
    chapter: CHAPTER,
    hanzi: (String(text).match(HANZI) || []).length,
    sections: sections(text).length,
    tables: tables(text).length,
    scoreRows: scoreRows(text).length,
    concepts: conceptStats(text),
  };
}

function main() {
  const text = read();
  const s = stats(text);
  console.log(`护理综合技能 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  const scoreNote = s.scoreRows ? '' : '（本章正文未设扣分档表）';
  console.log(`汉字 ${s.hanzi} 字 · 节 ${s.sections} 节 · 表 ${s.tables} 张 · 扣分档 ${s.scoreRows} 条${scoreNote}`);
  console.log('');
  for (const [label, value] of Object.entries(s.concepts)) {
    console.log(`  ${label}：${value}`);
  }
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算；本章不写参数取值与判定阈值，实施以现行规范与所在机构制度为准，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { CHAPTER, TITLE, DOC, read, sections, tables, rowsIn, scoreRows, numberedIn, bulletsIn, stats, CONCEPTS };
