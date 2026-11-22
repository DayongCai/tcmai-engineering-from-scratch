#!/usr/bin/env node
/**
 * 运动医学与损伤防护 · 第 6 章 过用性损伤不是用得太多，是修复追不上破坏
 * 课程: departments/04-gushang/05-yundong-yixue/chapters/06-qugan-guoyong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：分节、表格行、汉字数、判据词频与边界条数，都从本章正文读出。
 * 正文改版后重跑即可复现；手打的数字会静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '6';
const SLUG = '06-qugan-guoyong';
const TITLE = '过用性损伤不是用得太多，是修复追不上破坏';

/** 本章论证链上的判据词：正文必须出现，否则说明正文与本章索引已经脱节 */
const CONCEPTS = ["一段负荷", "总量", "强度", "频次", "条件", "尖峰式", "爬坡式", "承受力下降式", "肌腱病", "骨应力损伤", "髌股疼痛", "髂胫束", "足底筋膜", "急慢性负荷比", "提问的引子", "睡眠", "能量可用性", "马尾综合征"];

function readDoc(file) {
  return fs.readFileSync(file || DOC, 'utf8');
}

/** 「## 」二级标题，按出现顺序 */
function sections(text = readDoc()) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 表格数据行（排除分隔行） */
function tableRows(text = readDoc()) {
  let rows = 0;
  for (const line of text.split(/\r?\n/)) {
    if (/^\|/.test(line) && !/^\|[\s\-:|]+\|$/.test(line)) rows += 1;
  }
  return rows;
}

function hanzi(text = readDoc()) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

/** 「代价与边界」一节的条目 */
function boundaries(text = readDoc()) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s*代价与边界/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+/.test(line)) out.push(line.replace(/^-\s+/, ''));
  }
  return out;
}

function summarize(text = readDoc()) {
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    rows: tableRows(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  console.log('运动医学与损伤防护 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 表格 ' + s.rows + ' 行 · 边界 ' + s.boundaries.length + ' 条');
  console.log('');
  console.log('分节（正文现算）：');
  s.sections.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x));
  console.log('');
  console.log('判据词命中（正文现算）：');
  for (const c of s.concepts) console.log('  ' + (c.hits ? '✓' : '✗') + ' ' + c.term + '：' + c.hits);
  console.log('');
  console.log('边界（「代价与边界」一节，取前 3 条）：');
  s.boundaries.slice(0, 3).forEach((b) => console.log('  - ' + b));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, CONCEPTS, readDoc, sections, tableRows, hanzi, conceptHits, missing, boundaries, summarize };
