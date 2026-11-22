#!/usr/bin/env node
/**
 * 康复护理学 · 第 17 章 质量不是不出事，是把出事的方式提前写下来：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/17-zhiliang-fengxian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、指标四要素、高危环节与五类归纳，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 17;
const SLUG = '17-zhiliang-fengxian';
const TITLE = '质量不是不出事，是把出事的方式提前写下来';

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

/** 指标四要素：定义、分子、分母、来源 */
function indicatorParts(text) {
  const parts = ['定义', '分子', '分母', '来源'];
  const hit = parts.filter((p) => text.includes(`**${p}**`) || text.includes(`${p}（`));
  return { listed: parts.length, hit: hit.length };
}

/** 原因归纳五类：人、机、料、法、环 */
function fiveCategories(text) {
  const items = ['人（培训与配置）', '机（器具与设备）', '料（耗材与辅具）', '法（流程与制度）', '环（环境与照明）'];
  return items.filter((i) => text.includes(i)).length;
}

function summarize(text = readDoc()) {
  const indicators = tableShape(text, '| 指标 |');
  const hotspots = tableShape(text, '| 高危环节 |');
  const reports = tableShape(text, '| 上报内容 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    indicators,
    hotspots,
    reports,
    indicatorCells: indicators.rows * (indicators.cols - 1),
    parts: indicatorParts(text),
    categories: fiveCategories(text),
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
  console.log(`指标 ${s.indicators.rows} 个 × 四要素（定义／分子／分母／来源）= ${s.indicatorCells} 格；四要素命中 ${s.parts.hit}/${s.parts.listed}`);
  console.log(`高危环节 ${s.hotspots.rows} 处，上报字段示例 ${s.reports.rows} 项；原因归纳 ${s.categories} 类`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明指标口径，不构成管理规范。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, indicatorParts, fiveCategories, summarize };
