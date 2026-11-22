#!/usr/bin/env node
/**
 * 康复工程与支具学 · 第 1 章 支具不治病，它改变的是力的分配
 * 正文: departments/04-gushang/14-kangfu-gongcheng-zhiju/chapters/01-gailun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md。汉字数、节数、表数与表内行数、条目数、
 * 关键概念的出现次数全部从正文现算。正文一改，数字跟着变；把数字手打进代码，
 * 下一次修订就会静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 1;
const SLUG = '01-gailun';
const TITLE = '支具不治病，它改变的是力的分配';
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

/** 加粗术语的出现次数，形如 **三点固定** */
const bold = (text, term) => (text.match(new RegExp(`\\*\\*${term}\\*\\*`, 'g')) || []).length;

/** 本章的四个可数对象：四种作用、三种约束手段、四点固定的四个条件、责任链四个签字 */
function chapterFacts(text) {
  const roles = ['限制', '替代', '矫正', '代偿'].filter((r) => bold(text, r) >= 1);
  const threePoint = bullets(section(text, '三点固定'));
  const constraintMeans = items(section(text, '约束度'));
  const chain = tables(text).find((t) => t.head.join('').includes('谁负责'));
  const bottom = section(text, '代价与边界');
  return {
    roles,
    threePointRules: threePoint,
    constraintMeans,
    chainRows: chain ? chain.rows : 0,
    chainCols: chain ? chain.head.length : 0,
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
  console.log(`康复工程与支具学 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  四种作用    ${s.roles.length}（${s.roles.join('、')}）`);
  console.log(`  三点固定    成立条件 ${s.threePointRules} 条`);
  console.log(`  约束度      实现手段 ${s.constraintMeans} 种`);
  console.log(`  责任链      ${s.chainRows} 个环节 × ${s.chainCols} 列`);
  console.log(`  代价条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文任一节、表、条目变动，重跑本脚本即可看到新值。');
  console.log('※ 文中不写材料牌号、角度、佩戴时长与产品型号：这些属个体化处方，须由医师与矫形师按机构规范确定。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC,
  readDoc, headings, numbered, tables, section, bullets, items, citations, bold, chapterFacts, hanzi, stats, main,
};
