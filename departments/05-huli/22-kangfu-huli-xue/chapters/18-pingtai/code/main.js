#!/usr/bin/env node
/**
 * 康复护理学 · 第 18 章 教学平台给的是可复算的地基，不是标准答案：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/18-pingtai/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、四级结构、数的三类与可复算三件，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 18;
const SLUG = '18-pingtai';
const TITLE = '教学平台给的是可复算的地基，不是标准答案';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc(file = DOC) {
  return fs.readFileSync(file, 'utf8');
}

function countHanzi(text) {
  return (text.match(HANZI) || []).length;
}

function sections(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function tables(text) {
  let blocks = 0;
  let rows = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    rows += 1;
    if (/^\|[\s:|-]+\|$/.test(line)) blocks += 1;
  }
  return { blocks, rows };
}

function tableShape(text, header) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith(header));
  if (start < 0) throw new Error(`正文里找不到表格：${header}`);
  const cols = lines[start].split('|').map((c) => c.trim()).filter(Boolean).length;
  let rows = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    if (/^\|[\s:|-]+\|$/.test(lines[i])) continue;
    rows += 1;
  }
  return { rows, cols };
}

/** 可复算的三条：定义、来源、算式（正文写成「**第一条，定义。**」） */
function recalculationRules(text) {
  return new Set([...text.matchAll(/\*\*第([一二三])条，/g)].map((m) => m[1])).size;
}

/** 数据门禁三条：脱敏与去标识化、合成案例、最小必要（正文写成「**第一，…。**」） */
function gateRules(text) {
  return new Set([...text.matchAll(/\*\*第([一二三])，/g)].map((m) => m[1])).size;
}

function summarize(text = readDoc()) {
  const levels = tableShape(text, '| 级 |');
  const numberTypes = tableShape(text, '| 数的类型 |');
  const deliverables = tableShape(text, '| 交付物 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    levels,
    numberTypes,
    deliverables,
    levelCells: levels.rows * (levels.cols - 1),
    rules: recalculationRules(text),
    gates: gateRules(text),
  };
}

function main() {
  const s = summarize();
  console.log(`康复护理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文汉字 ${s.hanzi} 个 · 小节 ${s.sections.length} 节 · 表格 ${s.tables.blocks} 张 / ${s.tables.rows} 行`);
  console.log('');
  console.log('小节：');
  s.sections.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log('');
  console.log(`知识结构 ${s.levels.rows} 级（章／节／单元／条目）× 3 列 = ${s.levelCells} 格`);
  console.log(`数的类型 ${s.numberTypes.rows} 类（可数／可测／可估），交付物 ${s.deliverables.rows} 份`);
  console.log(`可复算 ${s.rules} 条，数据门禁 ${s.gates} 条`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明平台口径，不构成技术标准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, recalculationRules, gateRules, summarize };
