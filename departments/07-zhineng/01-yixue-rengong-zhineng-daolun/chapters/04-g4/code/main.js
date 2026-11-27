#!/usr/bin/env node
/**
 * 医学人工智能导论 · 第 4 章 系统的形状由写权限决定，不由技术栈决定
 * 正文: departments/07-zhineng/01-yixue-rengong-zhineng-daolun/chapters/04-g4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md，汉字数、节数、表数、引文条数全部从正文现算。
 * 正文一改，数字就跟着变；把数字手打进代码，下一次补实就会静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const SLUG = '04-g4';
const TITLE = '系统的形状由写权限决定，不由技术栈决定';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

/** 所有二级标题（含末节「代价与边界」） */
function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

/** 编号节：一、二、……；末节「代价与边界」不计入 */
function numbered(heads) {
  return heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h));
}

/** markdown 表：定界行 |---| 出现一次即一张表 */
function tables(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(line)).length;
}

/** 引文：《书名》或《书名·篇名》 */
function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)].sort() };
}

function stats() {
  const text = readDoc();
  const heads = headings(text);
  const c = citations(text);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: heads.length,
    numbered: numbered(heads).length,
    tables: tables(text),
    cites: c.total,
    books: c.books,
    drills: (text.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  const heads = headings(readDoc());
  const fmt = (n) => n.toLocaleString('en-US');

  console.log(`医学人工智能导论 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  演算设定    ${s.drills} 处`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('节标题：');
  for (const h of heads) console.log(`  · ${h}`);
  if (s.books.length) {
    console.log('');
    console.log(`引书：${s.books.map((b) => `《${b}》`).join('')}`);
  }
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文字数、节、表、引文任一变动，重跑本脚本即可看到新值。');
  console.log('※ 文中成本、时延、区间均为各节的演算设定，用于演示关系，不是任何机构的采集结果。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, numbered, tables, citations, hanzi, stats, main };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
