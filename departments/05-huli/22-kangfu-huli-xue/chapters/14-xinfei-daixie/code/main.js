#!/usr/bin/env node
/**
 * 康复护理学 · 第 14 章 心肺康复的门槛不在能不能动，在动到什么程度该停：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/14-xinfei-daixie/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、停止信号四条与自觉疲劳的目标区间，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 14;
const SLUG = '14-xinfei-daixie';
const TITLE = '心肺康复的门槛不在能不能动，在动到什么程度该停';

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

function tableRows(text, header) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith(header));
  if (start < 0) throw new Error(`正文里找不到表格：${header}`);
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    if (/^\|[\s:|-]+\|$/.test(lines[i])) continue;
    rows.push(lines[i].split('|').map((c) => c.trim()).filter(Boolean));
  }
  return rows;
}

/** 自觉疲劳：Borg 6–20，训练常用目标区间 11 至 14 分 */
function borg(text) {
  const all = text.match(/Borg\s*(\d+)[–-](\d+)\s*分/);
  const target = text.match(/目标区间是\s*(\d+)\s*至\s*(\d+)\s*分/);
  if (!all || !target) throw new Error('正文里的 Borg 区间已改写');
  const lo = Number(target[1]);
  const hi = Number(target[2]);
  return { min: Number(all[1]), max: Number(all[2]), targetLo: lo, targetHi: hi, width: hi - lo + 1 };
}

/** 现场处置三原则：先停后查、不离开、写清时间（按正文加粗的三条计） */
function siteRules(text) {
  const m = text.match(/现场处置有三条原则：([\s\S]*?)。/);
  if (!m) throw new Error('正文里找不到现场处置三原则');
  return (m[1].match(/\*\*[^*]+\*\*/g) || []).length;
}

function summarize(text = readDoc()) {
  const stops = tableRows(text, '| 信号 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    stops: stops.length,
    diseases: tableRows(text, '| 病种 |').length,
    glucoseChecks: tableRows(text, '| 时点 |').length,
    borg: borg(text),
    rules: siteRules(text),
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
  console.log(`停止信号 ${s.stops} 条，现场处置 ${s.rules} 条原则；病种 ${s.diseases} 类，糖尿病监测时点 ${s.glucoseChecks} 个`);
  console.log(
    `自觉疲劳 ${s.borg.min}–${s.borg.max} 分，目标区间 ${s.borg.targetLo} 至 ${s.borg.targetHi} 分（跨 ${s.borg.width} 档刻度）`
  );
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明现场判断口径，不构成运动处方。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableRows, borg, siteRules, summarize };
