#!/usr/bin/env node
/**
 * 康复护理学 · 第 15 章 特殊人群的护理，先去掉标签再谈方案：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/15-teshu-renqun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、三个分层依据与儿童三条原则，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 15;
const SLUG = '15-teshu-renqun';
const TITLE = '特殊人群的护理，先去掉标签再谈方案';

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

/** 三个分层依据：功能储备、发育阶段、生理状态（正文写成「**第一是…。**」） */
function layeringBases(text) {
  return new Set([...text.matchAll(/\*\*第([一二三])是/g)].map((m) => m[1])).size;
}

/** 儿童三条原则：一是短时多次、二是允许中断、三是把进步可视化 */
function childRules(text) {
  const m = text.match(/三条原则：([^。]+)。/);
  if (!m) throw new Error('正文里找不到儿童三条原则');
  return m[1].split('；').filter(Boolean).length;
}

function summarize(text = readDoc()) {
  const elder = tableShape(text, '| 风险 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    elder,
    elderCells: elder.rows * (elder.cols - 1),
    bases: layeringBases(text),
    child: childRules(text),
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
  console.log(`分层依据 ${s.bases} 个（功能储备／发育阶段／生理状态），年龄只提醒风险，不限定能力`);
  console.log(`老年 ${s.elder.rows} 类风险 × 3 项观察 = ${s.elderCells} 格；儿童原则 ${s.child} 条`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明分层口径，不构成照护指导。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, layeringBases, childRules, summarize };
