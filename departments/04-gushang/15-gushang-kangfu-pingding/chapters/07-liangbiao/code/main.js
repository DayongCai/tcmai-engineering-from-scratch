#!/usr/bin/env node
/**
 * 骨伤康复评定 · 第 7 章 量表不是越全越好，是能测出变化才算有用
 * 正文: departments/04-gushang/15-gushang-kangfu-pingding/chapters/07-liangbiao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md。汉字数、节数、四个性质的表的行与列、
 * 最小临床重要差异的出现次数与三条原则、选题五问全部从正文现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 7;
const SLUG = '07-liangbiao';
const TITLE = '量表不是越全越好，是能测出变化才算有用';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

const numbered = (heads) =>
  heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h) && !h.includes('代价与边界'));

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

function section(text, keyword) {
  const blocks = text.split(/^##\s+/m).slice(1);
  const hit = blocks.find((b) => b.split(/\r?\n/)[0].includes(keyword));
  return hit || '';
}

const bullets = (block) => block.split(/\r?\n/).filter((l) => /^-\s+\S/.test(l.trim())).length;
const items = (block) => block.split(/\r?\n/).filter((l) => /^\d+\.\s+\S/.test(l.trim())).length;

function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)].sort() };
}

const boldHas = (text, term) => new RegExp(`\\*\\*${term}`).test(text);

/** 本章可数对象：四个性质、三条最小临床差异原则、选题五问 */
function chapterFacts(text) {
  const propTable = tables(text).find((t) => t.head.join('').includes('用错了会怎样'));
  const mcidSection = section(text, '反应度与最小临床重要差异');
  const principles = mcidSection.split(/\r?\n/).filter((l) => /^\*\*/.test(l.trim())).length;
  const mcidMentions = (text.match(/最小临床重要差异/g) || []).length;
  const questions = items(section(text, '怎么选'));
  const bottom = section(text, '代价与边界');
  return {
    properties: propTable ? propTable.rows : 0,
    propCols: propTable ? propTable.head.length : 0,
    principles,
    mcidMentions,
    selectionQuestions: questions,
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
  console.log(`  量表性质    ${s.properties} 个 × ${s.propCols} 列`);
  console.log(`  最小差异    正文出现 ${s.mcidMentions} 次，使用原则 ${s.principles} 条`);
  console.log(`  选题五问    ${s.selectionQuestions} 问`);
  console.log(`  边界条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文任一节、表、条目变动，重跑本脚本即可看到新值。');
  console.log('※ 本章不推荐任何具体量表，也不给信效度数值门槛：临界值随领域与用途而变。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC,
  readDoc, headings, numbered, tables, section, bullets, items, citations, boldHas, chapterFacts, hanzi, stats, main,
};
