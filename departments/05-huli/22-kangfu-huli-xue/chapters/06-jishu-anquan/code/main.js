#!/usr/bin/env node
/**
 * 康复护理学 · 第 6 章 体位是处方，不是把被子掖好：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/06-jishu-anquan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、四个体位与三种转移方式的组合数，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const SLUG = '06-jishu-anquan';
const TITLE = '体位是处方，不是把被子掖好';

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

/** 从以表头开头的表格里读出数据行与列数 */
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

/** 翻身技术要点：正文以「一是／二是／三是／四是」列出 */
function turnPoints(text) {
  return (text.match(/[一二三四]是\*\*/g) || []).length;
}

function summarize(text = readDoc()) {
  const posture = tableShape(text, '| 体位 |');
  const transfer = tableShape(text, '| 方式 |');
  const steps = 4; // 先说清再动／先坐稳再站／先转移重心再移动／落座后复查
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    posture,
    transfer,
    turnPoints: turnPoints(text),
    combinations: transfer.rows * steps,
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
  console.log(`四个体位表 ${s.posture.rows} 行 × ${s.posture.cols - 1} 项内容 = ${s.posture.rows * (s.posture.cols - 1)} 格`);
  console.log(`转移方式 ${s.transfer.rows} 种 × 四个步骤 = ${s.combinations} 处动作要求（步骤不因方式而变）`);
  console.log(`翻身技术要点 ${s.turnPoints} 条`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明摆放方向与动作序列，不替代治疗师处方。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, turnPoints, summarize };
