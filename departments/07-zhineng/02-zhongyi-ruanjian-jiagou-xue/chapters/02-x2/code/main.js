#!/usr/bin/env node
/**
 * 中医软件架构 · 第 2 章 · 接口不是函数签名，是一份能单独验收的文档
 * 正文: departments/07-zhineng/02-zhongyi-ruanjian-jiagou-xue/chapters/02-x2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本只读本章正文：节数、表格行数、汉字数与关键词命中全部现算。
 * 正文改动后重跑即可复现，不把数字写成常数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const THESIS = "对外以文档为准，对内以事件为流";
const KEY_TERMS = [
  "语义",
  "所有权",
  "幂等",
  "契约测试",
  "版本兼容"
];

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function hanzi(text) {
  return (String(text).match(/[\u4e00-\u9fff]/g) || []).length;
}

function lines(text) {
  return String(text).split(/\r?\n/);
}

function title(text) {
  const line = lines(text).find((x) => /^#\s+/.test(x));
  return line ? line.replace(/^#\s+/, '').trim() : '';
}

function sections(text) {
  return lines(text)
    .filter((x) => /^##\s+/.test(x))
    .map((x) => x.replace(/^##\s+/, '').trim());
}

function tableLines(text) {
  return lines(text).filter((x) => /^\|/.test(x) && !/^\|[\s:|-]+\|$/.test(x));
}

function countTerm(text, term) {
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(term, i)) !== -1) {
    n += 1;
    i += term.length;
  }
  return n;
}

function analyze(text) {
  const secs = sections(text);
  const terms = KEY_TERMS.map((t) => ({ term: t, count: countTerm(text, t) }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'zh'));
  return {
    chapter: CHAPTER,
    title: title(text),
    sections: secs,
    sectionCount: secs.length,
    tableRows: tableLines(text).length,
    hanzi: hanzi(text),
    terms,
    topTerm: terms[0],
    thesis: THESIS,
    thesisPresent: text.includes(THESIS),
  };
}

function assertShape(a) {
  const bad = [];
  if (!a.title.startsWith(`第 ${CHAPTER} 章`)) bad.push('标题章号不符');
  if (a.sectionCount < 5) bad.push(`节数不足：${a.sectionCount}`);
  if (a.tableRows < 4) bad.push(`表格行数不足：${a.tableRows}`);
  if (a.hanzi < 2500) bad.push(`汉字数不足：${a.hanzi}`);
  const missing = a.terms.filter((t) => t.count === 0).map((t) => t.term);
  if (missing.length) bad.push(`关键词缺失：${missing.join('、')}`);
  if (!a.thesisPresent) bad.push('主线句不在正文');
  return bad;
}

function main() {
  const text = readDoc();
  const a = analyze(text);
  const bad = assertShape(a);

  console.log(`中医软件架构 · ${a.title}`);
  console.log('');
  console.log(`${a.hanzi.toLocaleString('en-US')} 汉字 · ${a.sectionCount} 节 · 表格 ${a.tableRows} 行`);
  console.log('');
  console.log('关键词命中（正文现算）：');
  for (const t of a.terms) console.log(`  ${t.term}：${t.count}`);
  console.log(`  → 出现最多：${a.topTerm.term}（${a.topTerm.count}）`);
  console.log('');
  console.log(`主线：${THESIS}`);
  console.log('');
  console.log(bad.length ? `✗ 结构自检未通过：${bad.join('；')}` : '✓ 结构自检通过（6 项）');
  console.log('※ 数字全部由本章正文 docs/zh.md 现算，正文改动后重跑即可复现。');
  console.log('※ 本章为教学讨论，不构成诊疗、用药或信息化决策建议。');
  if (bad.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  THESIS,
  KEY_TERMS,
  readDoc,
  hanzi,
  title,
  sections,
  tableLines,
  countTerm,
  analyze,
  assertShape,
};
