#!/usr/bin/env node
/**
 * 中医儿科学 · 第 4 章 儿科四诊概要：本章文本口径
 * 课程: departments/01-zhongyi/13-zhongyi-erke-xue/chapters/04-erke-sizhen/docs/zh.md
 * 数据: 本章正文 docs/zh.md（现读现算；不引外部表，不写死任何计数）
 * 依赖: 仅 Node.js 标准库
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

/** 本章要盯的术语：证据从哪来、什么被当成证据 */
const TERMS = ['望诊', '得神', '失神', '指纹', '斑疹', '麻疹', '转诊', '未查'];

const read = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
const count = (s, t) => s.split(t).length - 1;
const lines = (s) => s.split(/\r?\n/);

function headings(text = read()) {
  return lines(text)
    .filter((l) => /^##\s/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function tableRows(text = read()) {
  return lines(text)
    .map((l) => l.trim())
    .filter((l) => /^\|/.test(l) && !/^\|[\s:|-]+\|?$/.test(l));
}

function paragraphs(text = read()) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^[#>|]|^[-*]\s|^\d+\.\s/.test(p));
}

function citations(text = read()) {
  const books = new Map();
  for (const m of text.matchAll(/《([^》]+)》/g)) books.set(m[1], (books.get(m[1]) || 0) + 1);
  const ranked = [...books.entries()].sort((a, b) => b[1] - a[1]);
  return { books: books.size, total: ranked.reduce((a, [, c]) => a + c, 0), top: ranked.slice(0, 3) };
}

function termStats(text = read()) {
  return TERMS.map((term) => ({ term, count: count(text, term) })).filter((x) => x.count);
}

function checklistCount(text = read()) {
  return lines(text).filter((l) => /^\s*-\s*\[[ x]\]/.test(l)).length;
}

function doseGuard(text = read()) {
  return (text.match(/\d+(?:\.\d+)?\s*(?:mg|毫克|毫升|ml|mL|μg|微克)/gi) || []).length;
}

function pageRefs(text = read()) {
  return (text.match(/第\s*\d+\s*页/g) || []).length;
}

function stats(text = read()) {
  return {
    chapter: CHAPTER,
    hanzi: hanzi(text),
    headings: headings(text),
    tables: tableRows(text).length,
    paragraphs: paragraphs(text).length,
    citations: citations(text),
    terms: termStats(text),
    checklist: checklistCount(text),
    doses: doseGuard(text),
    pages: pageRefs(text),
  };
}

module.exports = {
  CHAPTER,
  DOC,
  TERMS,
  read,
  hanzi,
  headings,
  tableRows,
  paragraphs,
  citations,
  termStats,
  checklistCount,
  doseGuard,
  pageRefs,
  stats,
};

if (require.main === module) {
  const s = stats();
  console.log('═══ 中医儿科学 · 第 4 章 儿科四诊概要 ═══');
  console.log(`正文 ${s.hanzi} 汉字 · ${s.paragraphs} 段 · ${s.headings.length} 个二级标题 · 表格 ${s.tables} 行`);
  console.log('\n标题：');
  for (const h of s.headings) console.log(`  · ${h}`);
  console.log(`\n正文内书名 ${s.citations.books} 部 · ${s.citations.total} 次 · 前三：` +
    s.citations.top.map(([n, c]) => `${n}(${c})`).join('、'));
  console.log('\n术语命中：' + s.terms.map((x) => `${x.term}×${x.count}`).join('  '));
  console.log(`\n检查清单 ${s.checklist} 条 · 剂量单位 ${s.doses} 处 · 页码 ${s.pages} 处`);
  console.log('读法：脉不可靠，证据只能从看得见的地方取；顺序错一步，后面的项目全部作废。');
  console.log('记录三格：条件、所见、未查——写「未查」比写「正常」安全。');
  console.log('\n※ 教学样例：数字由本章正文现算，不构成诊疗建议，不能替代医师面诊。');
}
