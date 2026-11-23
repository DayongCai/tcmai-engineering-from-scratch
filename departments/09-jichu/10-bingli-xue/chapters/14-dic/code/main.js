#!/usr/bin/env node
/**
 * 病理学 —— 把本章正文当数据读
 * 正文: docs/zh.md（唯一数据源）
 * 依赖: 仅 Node.js 标准库
 *
 * 形态学这一课的可核对之处，都在正文自己身上：几节、几张表、几行引文、
 * 十二个单元的编号是否写齐、每节摊到多少字。这些数一旦手打就会过期，
 * 所以这里一处常量都不写——正文改一个字，输出就跟着改。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const H2 = /^##\s+(.+?)\s*$/;
const TABLE_SEP = /^\|\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const LOCATOR = /教材·第\s*\d+\s*章·\d+\.\d+\.\d+/;
const UNIT = /\b\d{1,2}\.\d\.\d\b/g;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** CJK 汉字数：不含标点、数字与拉丁字母 */
function hanzi(text) {
  return (String(text).match(CJK) || []).length;
}

/** 首行 H1：第 N 章 · 判断句 */
function head(md) {
  const h1 = (md.match(/^#\s+(.+)$/m) || [, ''])[1].trim();
  const m = h1.match(/^第\s*(\d+)\s*章\s*[·・:：]\s*(.+)$/);
  return m ? { n: Number(m[1]), title: m[2].trim() } : { n: null, title: h1 };
}

/** 首个二级节之前的部分（题记与问题）：与各节汉字数分开算 */
function lead(md) {
  const at = md.search(/^## /m);
  return hanzi(at < 0 ? md : md.slice(0, at));
}

/** 二级小节：标题 + 各节汉字数（lead 加各节之和 = 全文汉字数） */
function sections(md) {
  const lines = md.split('\n');
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(H2);
    if (m) {
      if (cur) out.push(cur);
      cur = { title: m[1].trim(), hanzi: hanzi(m[1]) };
      continue;
    }
    if (cur) cur.hanzi += hanzi(line);
  }
  if (cur) out.push(cur);
  return out;
}

/** 表格：分隔行前面是表头，分隔行之后是数据行 */
function tables(md) {
  const lines = md.split('\n');
  let count = 0;
  let rows = 0;
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!/^\|/.test(lines[i].trim()) || !TABLE_SEP.test(lines[i + 1].trim())) continue;
    count += 1;
    for (let k = i + 2; k < lines.length; k += 1) {
      const l = lines[k].trim();
      if (!l.startsWith('|')) break;
      if (l.replace(/[|\-\s:]/g, '').length) rows += 1;
    }
  }
  return { tables: count, rows };
}

/** 引文行：带「教材·第N章·N.M.K」出处的行数 */
function quotes(md) {
  return md.split('\n').filter((l) => LOCATOR.test(l)).length;
}

/** 单元编号：正文里出现的 N.M.K 去重后排序 */
function unitIds(md) {
  return [...new Set(String(md).match(UNIT) || [])].sort();
}

/** 图注条目 */
function figures(md) {
  return (md.match(/^\*\*图\s*\d+-\d+/gm) || []).length;
}

function shape(md) {
  const secs = sections(md);
  const t = tables(md);
  return {
    hanzi: hanzi(md),
    lead: lead(md),
    secs: secs.length,
    perSection: secs.map((s) => s.hanzi),
    sectionTitles: secs.map((s) => s.title),
    tables: t.tables,
    rows: t.rows,
    quotes: quotes(md),
    units: unitIds(md).length,
    figures: figures(md),
  };
}

/** 本章算术：每节均值、每单元均值、最长的一节 */
function average(shapeValue, unitCount = 12) {
  const s = shapeValue;
  const perSection = Math.round(s.hanzi / s.secs);
  const perUnit = Math.round(s.hanzi / unitCount);
  let largest = { title: '', hanzi: -1 };
  s.sectionTitles.forEach((title, i) => {
    if (s.perSection[i] > largest.hanzi) largest = { title, hanzi: s.perSection[i] };
  });
  return { perSection, perUnit, largest };
}

function main() {
  const md = readDoc();
  const h = head(md);
  const s = shape(md);
  const a = average(s);
  console.log('第 ' + h.n + ' 章 · ' + h.title);
  console.log('规模: 正文 ' + s.hanzi + ' 汉字 · ' + s.secs + ' 个二级小节 · ' + s.tables + ' 张表 · ' + s.rows + ' 行表数据');
  console.log('出证: 带出处的引文行 ' + s.quotes + ' 条 · 单元编号 ' + s.units + ' 个 · 图注 ' + s.figures + ' 条');
  console.log('算术: 平均每节 ' + a.perSection + ' 字 · 平均每单元 ' + a.perUnit + ' 字 · 最长一节「' + a.largest.title + '」' + a.largest.hanzi + ' 字');
  const sum = s.lead + s.perSection.reduce((x, y) => x + y, 0);
  console.log('核对: 题记 ' + s.lead + ' + 各节 ' + s.perSection.reduce((x, y) => x + y, 0) + ' = ' + sum + ' vs 正文 ' + s.hanzi + (sum === s.hanzi ? ' ✓' : ' ✗'));
  console.log('教学边界：本章只说明形态与类别与关系，不写数值与单位与参考值，不构成诊断/治疗/用药依据。');
}

module.exports = { readDoc, hanzi, head, lead, sections, tables, quotes, unitIds, figures, shape, average };

if (require.main === module) main();
