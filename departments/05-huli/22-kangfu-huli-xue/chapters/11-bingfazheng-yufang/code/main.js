#!/usr/bin/env node
/**
 * 康复护理学 · 第 11 章 并发症不是意外，是没被记录下来的趋势：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/11-bingfazheng-yufang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、四类风险与分层措施的行数，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const SLUG = '11-bingfazheng-yufang';
const TITLE = '并发症不是意外，是没被记录下来的趋势';

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

/** 约束的四重后果：压疮、血栓、谵妄与功能退化 */
function restraintHarms(text) {
  const m = text.match(/长期约束，会带来([^四]+)四重后果/);
  if (!m) throw new Error('正文里找不到约束代价段');
  return { listed: m[1].split(/[、与]/).filter(Boolean).length, stated: 4 };
}

function summarize(text = readDoc()) {
  const risks = tableShape(text, '| 风险 |');
  const tools = tableShape(text, '| 工具 |');
  const actions = tableShape(text, '| 风险档 |');
  const trends = tableShape(text, '| 趋势信号 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    risks,
    tools,
    actions,
    trends,
    riskCells: risks.rows * (risks.cols - 1),
    restraint: restraintHarms(text),
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
  console.log(`风险 ${s.risks.rows} 类 ×（机制／能改变／无法改变）${s.riskCells} 格`);
  console.log(`评分工具 ${s.tools.rows} 项，分层措施 ${s.actions.rows} 档，趋势信号 ${s.trends.rows} 条`);
  console.log(`长期约束列出的后果：${s.restraint.listed} 项（正文标 ${s.restraint.stated} 重）`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明观察口径，不构成护理规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, restraintHarms, summarize };
