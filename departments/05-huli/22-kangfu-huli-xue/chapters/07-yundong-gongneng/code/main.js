#!/usr/bin/env node
/**
 * 康复护理学 · 第 7 章 训练的成败取决于护理怎么排那二十三个小时：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/07-yundong-gongneng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、剂量四要素、守护三档与护理能支配的时间，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const SLUG = '07-yundong-gongneng';
const TITLE = '训练的成败取决于护理怎么排那二十三个小时';

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

/** 从以表头开头的表格里读出行数与列数 */
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

/** 五条停训线：正文以「第一，**…」到「第五，**…」列出 */
function stopLines(text) {
  return (text.match(/第[一二三四五]，\*\*/g) || []).length;
}

/** 护理真正能支配的时间：一天 24 小时扣掉治疗师的四十分钟 */
function nursingWindow(text) {
  if (!text.includes('四十分钟') || !text.includes('二十三个小时二十分钟')) {
    throw new Error('正文里的时间口径变了（四十分钟／二十三个小时二十分钟）');
  }
  const therapyMinutes = 40;
  const rest = 24 * 60 - therapyMinutes;
  return { therapyMinutes, restMinutes: rest, hours: Math.floor(rest / 60), minutes: rest % 60 };
}

function summarize(text = readDoc()) {
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    dose: tableShape(text, '| 要素 |'),
    guard: tableShape(text, '| 守护档 |'),
    stops: stopLines(text),
    window: nursingWindow(text),
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
  console.log(`剂量 ${s.dose.rows} 个要素 × （谁定／护理能做什么／不能做什么）= ${s.dose.rows * 3} 格`);
  console.log(`守护 ${s.guard.rows} 档，停训线 ${s.stops} 条`);
  console.log(
    `护理能支配的时间：24 小时 − ${s.window.therapyMinutes} 分钟治疗 = ${s.window.hours} 小时 ${s.window.minutes} 分钟`
  );
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明排班口径，不构成运动处方。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, stopLines, nursingWindow, summarize };
