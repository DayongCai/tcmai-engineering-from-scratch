#!/usr/bin/env node
/**
 * 儿科护理学 · 第 13 章 儿童常见症状与疼痛的护理：正文自检
 * 课程: departments/05-huli/10-erke-huli-xue/chapters/13-zhengzhuang-tengtong/docs/zh.md
 * 只读本章正文，现算篇幅、结构与重点词频；不手打数字，不引用外部参数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 13;
const SLUG = '13-zhengzhuang-tengtong';
const TITLE = '疼痛要问孩子，不能只问那个替他回答的人';
const FOCUS = ["行为观察","自我报告","复评","非药物"];
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function analyze(text = readDoc()) {
  const src = String(text);
  const lines = src.split(/\r?\n/);
  const sections = lines.filter((l) => /^##\s+/.test(l)).length;
  const paragraphs = lines.filter((l) => {
    const t = l.trim();
    return t && !/^[#>|]/.test(t) && !/^[-*]\s+/.test(t);
  }).length;

  let tables = 0;
  let tableDataRows = 0;
  let inTable = false;
  let rowIndex = 0;
  for (const l of lines) {
    const isRow = /^\s*\|/.test(l);
    if (isRow) {
      if (!inTable) { inTable = true; tables += 1; rowIndex = 0; }
      rowIndex += 1;
      if (rowIndex > 2) tableDataRows += 1;
    } else {
      inTable = false;
    }
  }

  const listItems = lines.filter((l) => /^\s*[-*]\s+/.test(l)).length;
  const bold = new Set();
  for (const m of src.matchAll(/\*\*([^*\n]+)\*\*/g)) {
    const term = m[1].trim();
    if (term) bold.add(term);
  }

  const books = new Set();
  let citations = 0;
  for (const m of src.matchAll(/《([^》]+)》/g)) {
    books.add(m[1]);
    citations += 1;
  }

  const focus = {};
  for (const term of FOCUS) {
    focus[term] = src.split(term).length - 1;
  }

  return {
    hanzi: hanzi(src),
    sections,
    paragraphs,
    tables,
    tableDataRows,
    listItems,
    boldTerms: bold.size,
    citations,
    books: books.size,
    focus
  };
}

function main() {
  const s = analyze();
  console.log(`儿科护理学 · 第 ${CHAPTER} 章 ${TITLE} · 正文自检`);
  console.log(`文件: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`篇幅: ${s.hanzi.toLocaleString('en-US')} 汉字 · ${s.sections} 小节 · ${s.paragraphs} 段落`);
  console.log(`结构: ${s.tables} 表格（${s.tableDataRows} 数据行）· ${s.listItems} 列表项 · ${s.boldTerms} 粗体术语 · 引书 ${s.books} 部 / ${s.citations} 次`);
  console.log('');
  console.log('重点词频（正文现数）：');
  for (const term of FOCUS) console.log(`  ${term}: ${s.focus[term]}`);
  console.log('');
  console.log('※ 数字全部由本章正文现算，不手打，不引用外部参数。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据；一切以现行规范与机构制度为准。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG, TITLE, FOCUS };
