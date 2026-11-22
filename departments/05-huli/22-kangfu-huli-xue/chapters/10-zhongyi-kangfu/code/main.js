#!/usr/bin/env node
/**
 * 康复护理学 · 第 10 章 中医技术的边界，比它的手法更需要交代：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/10-zhongyi-kangfu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、三档适用、参与四档与灸前灸后的条数，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const SLUG = '10-zhongyi-kangfu';
const TITLE = '中医技术的边界，比它的手法更需要交代';

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

/** 灸前必须定下的三件事：第一是距离、第二是时长与部位、第三是环境 */
function moxaPreparations(text) {
  if (!text.includes('灸后要有交代') && !text.includes('三件事必须在动手前定下来')) {
    throw new Error('正文里灸法准备段已改写');
  }
  return new Set([...text.matchAll(/第([一二三])是\*\*/g)].map((m) => m[1])).size;
}

/** 灸后交代的三条：当日不洗浴、局部避免摩擦、水泡不自行挑破 */
function moxaAftercare(text) {
  const m = text.match(/灸后要有交代：([^。]+)。/);
  if (!m) throw new Error('正文里找不到灸后交代段');
  return m[1].split('、').length;
}

function summarize(text = readDoc()) {
  const triage = tableShape(text, '| 档 |');
  const participation = tableShape(text, '| 参与档 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    triage,
    participation,
    participationCells: participation.rows * (participation.cols - 2),
    preps: moxaPreparations(text),
    aftercare: moxaAftercare(text),
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
  console.log(`适用 ${s.triage.rows} 档（可做／慎做／不做），先划不做，再谈怎么做`);
  console.log(`传统运动 ${s.participation.rows} 档 × （护理守什么／停止信号）${s.participation.rows * 2} 格`);
  console.log(`灸前定 ${s.preps} 件事，灸后交代 ${s.aftercare} 条`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明判断框架，不构成技术操作规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, moxaPreparations, moxaAftercare, summarize };
