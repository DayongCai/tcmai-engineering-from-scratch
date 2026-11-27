#!/usr/bin/env node
/**
 * 骨伤康复评定 · 第 1 章 评定不是给功能打分，是把「他现在不能做什么」换成「下一步做什么」
 * 正文: departments/04-gushang/15-gushang-kangfu-pingding/chapters/01-pingding-gailun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md。汉字数、节数、表数与表内行数、条目数、
 * 加粗术语的全部从正文现算。正文一改，数字跟着变；把数字手打进代码，
 * 下一次修订就会静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 1;
const SLUG = '01-pingding-gailun';
const TITLE = '评定不是给功能打分，是把「他现在不能做什么」换成「下一步做什么」';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 二级标题全文 */
function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

/** 编号节：一、二、……；末节「代价与边界」不计入 */
const numbered = (heads) =>
  heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h) && !h.includes('代价与边界'));

/** 一张表 = 定界行 |---| + 紧随其后的数据行 */
function tables(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out = [];
  for (let i = 1; i < lines.length - 1; i += 1) {
    if (!/^\|[\s:|-]*-{3}[\s:|-]*\|$/.test(lines[i])) continue;
    const head = lines[i - 1].split('|').slice(1, -1).map((c) => c.trim());
    let rows = 0;
    let j = i + 1;
    while (j < lines.length && /^\|.*\|$/.test(lines[j]) && !/^\|[\s:|-]*-{3}/.test(lines[j])) {
      rows += 1;
      j += 1;
    }
    out.push({ head, rows });
    i = j - 1;
  }
  return out;
}

/** 某一节（按标题关键词定位）的正文块 */
function section(text, keyword) {
  const blocks = text.split(/^##\s+/m).slice(1);
  const hit = blocks.find((b) => b.split(/\r?\n/)[0].includes(keyword));
  return hit || '';
}

/** 块内的无序条目（- 开头）与有序条目（1. 开头） */
const bullets = (block) => block.split(/\r?\n/).filter((l) => /^-\s+\S/.test(l.trim())).length;
const items = (block) => block.split(/\r?\n/).filter((l) => /^\d+\.\s+\S/.test(l.trim())).length;

/** 引文：《书名》或《书名·篇名》 */
function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)].sort() };
}

/** 加粗术语的出现次数，形如 **能不能做** */
const bold = (text, term) => (text.match(new RegExp(`\\*\\*${term}\\*\\*`, 'g')) || []).length;

/**
 * 本章的四个可数对象：
 * 三种决策形态（能不能做／做什么／什么时候再看）、三层结构（结构／活动／参与）、
 * 四个常规时点、以及「三种把评定做成文书的形态」。
 */
function chapterFacts(text) {
  const forms = bullets(section(text, '评定的产出是一句话'));
  const layerTable = tables(text).find((t) => t.head.join('').includes('单独使用的盲区'));
  const timeTable = tables(text).find((t) => t.head.join('').includes('缺了会怎样'));
  const docForms = ['能不能做', '做什么', '什么时候再看'].filter((t) => bold(text, t) >= 1);
  const bottom = section(text, '代价与边界');
  return {
    decisionForms: forms,
    decisionTerms: docForms,
    layers: layerTable ? layerTable.rows : 0,
    layerCols: layerTable ? layerTable.head.length : 0,
    timepoints: timeTable ? timeTable.rows : 0,
    documentForms: ['其一', '其二', '其三'].filter((t) => new RegExp(`\\*\\*${t}[，,]`).test(text)).length,
    boundaries: bullets(bottom),
  };
}

function stats() {
  const text = readDoc();
  const heads = headings(text);
  const c = citations(text);
  const f = chapterFacts(text);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: heads.length,
    numbered: numbered(heads).length,
    tables: tables(text).length,
    cites: c.total,
    books: c.books,
    ...f,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  const fmt = (n) => n.toLocaleString('en-US');
  console.log(`骨伤康复评定 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  决策形态    ${s.decisionForms} 种（${s.decisionTerms.join('、')}）`);
  console.log(`  功能分层    ${s.layers} 层 × ${s.layerCols} 列`);
  console.log(`  评定标签    ${s.timepoints} 个时点`);
  console.log(`  文书形态    ${s.documentForms} 种`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文任一节、表、条目变动，重跑本脚本即可看到新值。');
  console.log('※ 文中随访人数与记录出现次数为合成示例；本章不给任何量表条目、计分方法与判读阈值。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC,
  readDoc, headings, numbered, tables, section, bullets, items, citations, bold, chapterFacts, hanzi, stats, main,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
