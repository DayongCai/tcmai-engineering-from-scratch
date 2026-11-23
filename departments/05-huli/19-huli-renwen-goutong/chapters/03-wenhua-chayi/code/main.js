#!/usr/bin/env node
/**
 * 护理人文修养与沟通 · 第 3 章：正文自测口径
 * 课程: departments/05-huli/19-huli-renwen-goutong/chapters/03-wenhua-chayi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数据只有一份：本章 docs/zh.md。汉字、节、表、段、以及正文里出现的算术，
 * 全部由本脚本现读现算，不手打、不引外部数据源。
 * 正文改一个字，这里的数就跟着变；main.test.js 会因此失败，而不是继续输出旧值。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '3';
const SLUG = '03-wenhua-chayi';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const DOC_LABEL = `chapters/${SLUG}/docs/zh.md`;

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

const countHanzi = (s) => (String(s || '').match(HANZI) || []).length;
const toLines = (s) => String(s).replace(/\r\n/g, '\n').split('\n');

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error(`本章正文缺失：${DOC}`);
  return fs.readFileSync(DOC, 'utf8');
}

/** 标题：文件里唯一的一级标题 */
function titleOf(text) {
  const hit = toLines(text).find((x) => /^#\s+/.test(x));
  return hit ? hit.replace(/^#\s+/, '').trim() : '';
}

/** 节：`## ` 二级标题，返回标题数组 */
function sectionTitles(text) {
  return toLines(text)
    .filter((x) => /^##\s+/.test(x))
    .map((x) => x.replace(/^##\s+/, '').trim());
}

/** 表：连续的 `|` 行算一块；数据行 = 行数 − 表头 − 分隔行 */
function tables(text) {
  const blocks = [];
  let cur = [];
  for (const line of toLines(text)) {
    if (/^\s*\|/.test(line)) cur.push(line);
    else if (cur.length) { blocks.push(cur); cur = []; }
  }
  if (cur.length) blocks.push(cur);
  const real = blocks.filter((b) => b.length >= 2 && /^\s*\|[-: |]+\|\s*$/.test(b[1]));
  return { blocks: real.length, rows: real.reduce((n, b) => n + Math.max(0, b.length - 2), 0) };
}

/** 段：空行分隔的块，去掉标题、表格、引用块与过短的残片 */
function paragraphs(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !/^#{1,6}\s/.test(b) && !/^\|/.test(b) && !/^>/.test(b) && countHanzi(b) >= 10);
}

const fmt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(Math.round(n * 10000) / 10000);
};

/**
 * 正文算术：乘、除、幂、分数四类写法，按出现顺序去重。
 * 只认正文里写出来的式子，不替正文补算式 —— 正文没写的东西不该出现在这里。
 */
function arithmetic(text) {
  const body = toLines(text).map((l) => l.replace(/^\s*>\s?/, '')).join('\n');
  const out = [];
  const seen = new Set();
  const push = (expr, value, kind) => {
    const key = `${expr}=${fmt(value)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ expr, value, kind });
  };

  // 数字与运算符之间允许夹一个量词单位（「600 秒 ÷ 18 项」这类写法）
  const NUM = '((\\d+(?:\\.\\d+)?)\\s*(秒|分钟|小时|天|条|项|个|次|人|位|张|床|级|格|篇|句|名|层)?)';
  const mul = new RegExp(`${NUM}\\s*×\\s*${NUM}`, 'g');
  const div = new RegExp(`${NUM}\\s*÷\\s*${NUM}`, 'g');

  const label = (n, u) => (u ? `${n} ${u}` : `${n}`);

  for (const m of body.matchAll(mul)) {
    push(`${label(m[2], m[3])} × ${label(m[5], m[6])}`, Number(m[2]) * Number(m[5]), 'mul');
  }
  for (const m of body.matchAll(div)) {
    push(`${label(m[2], m[3])} ÷ ${label(m[5], m[6])}`, Number(m[2]) / Number(m[5]), 'div');
  }
  for (const m of body.matchAll(/(\d+(?:\.\d+)?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g)) {
    const exp = Number([...m[2]].map((c) => SUP[c]).join(''));
    push(`${m[1]}^${exp}`, Math.pow(Number(m[1]), exp), 'pow');
  }
  for (const m of body.matchAll(/(^|[^\d.\/])(\d+)\s*\/\s*(\d+)(?![\d.\/])/g)) {
    push(`${m[2]} / ${m[3]}`, Number(m[2]) / Number(m[3]), 'frac');
  }
  return out;
}

function measure() {
  const text = readDoc();
  const tb = tables(text);
  const secs = sectionTitles(text);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    doc: DOC_LABEL,
    title: titleOf(text),
    hanzi: countHanzi(text),
    sections: secs.length,
    sectionTitles: secs,
    tables: tb.blocks,
    tableRows: tb.rows,
    paragraphs: paragraphs(text).length,
    arithmetic: arithmetic(text),
  };
}

function report(m) {
  const out = [];
  out.push(`护理人文修养与沟通 · 第 ${m.chapter} 章 ${m.title.replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  out.push(`正文: ${m.doc}（唯一数据源，只读这一份）`);
  out.push('');
  out.push(`汉字 ${m.hanzi} · 节 ${m.sections} · 表 ${m.tables} 块（数据行 ${m.tableRows}）· 段 ${m.paragraphs}`);
  out.push('');
  if (m.arithmetic.length) {
    out.push('正文算术（逐条现算，不照抄结论）：');
    for (const a of m.arithmetic) {
      const pct = (a.kind === 'div' || a.kind === 'frac') && a.value < 1
        ? `（≈ ${(a.value * 100).toFixed(1)}%）`
        : '';
      out.push(`  ${a.expr} = ${fmt(a.value)}${pct}`);
    }
  } else {
    out.push('正文算术：本章正文没有写算式，可核对的量只有上行的规模数（节、表、段）。');
  }
  out.push('');
  out.push('口径说明：以上数字全部由本章正文现算，正文一改即变，测试会随之失败。');
  return out.join('\n');
}

function main() {
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(measure(), null, 2) + '\n');
    return;
  }
  console.log(report(measure()));
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, DOC, DOC_LABEL, countHanzi, titleOf, sectionTitles, tables, paragraphs, arithmetic, measure, report, main };
