#!/usr/bin/env node
/**
 * 康复护理学 · 第 8 章 让他自己做，比替他做慢得多也难得多：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/08-adl/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、六项任务是几档，以及正文那笔喂饭账，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const SLUG = '08-adl';
const TITLE = '让他自己做，比替他做慢得多也难得多';

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

/** 汉字数字转阿拉伯数字（够用到九十九，正文里的时间是这么写的） */
function cnToNumber(s) {
  const d = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (!s.includes('十')) return d[s] ?? NaN;
  const [a, b] = s.split('十');
  const tens = a ? d[a] : 1;
  const ones = b ? d[b] : 0;
  return tens * 10 + ones;
}

/** 正文那笔账：独立进食四十分钟、协助二十五分钟、完全喂食十分钟 */
function mealLedger(text) {
  const m = text.match(/独立进食约需([零一二三四五六七八九十]+)分钟，协助进食约需([零一二三四五六七八九十]+)分钟，完全喂食约需([零一二三四五六七八九十]+)分钟/);
  if (!m) throw new Error('正文里的进食时间账变了，取不到三个分钟数');
  const independent = cnToNumber(m[1]);
  const assisted = cnToNumber(m[2]);
  const fed = cnToNumber(m[3]);
  return { independent, assisted, fed, savedPerMeal: independent - fed, savedVsAssist: assisted - fed };
}

function summarize(text = readDoc()) {
  const tasks = tableShape(text, '| 任务 |');
  const levels = tasks.cols - 1;
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    tasks,
    levels,
    cells: tasks.rows * levels,
    ledger: mealLedger(text),
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
  console.log(`${s.tasks.rows} 项任务 × ${s.levels} 个协助等级 = ${s.cells} 格（每格写清「帮到哪一步」）`);
  console.log(
    `喂饭账：独立 ${s.ledger.independent} 分钟／协助 ${s.ledger.assisted} 分钟／喂食 ${s.ledger.fed} 分钟；` +
      `当班省 ${s.ledger.savedPerMeal} 分钟，比协助省 ${s.ledger.savedVsAssist} 分钟`
  );
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明协助口径，不构成护理操作规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, cnToNumber, mealLedger, summarize };
