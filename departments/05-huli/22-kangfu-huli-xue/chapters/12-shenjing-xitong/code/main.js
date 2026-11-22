#!/usr/bin/env node
/**
 * 康复护理学 · 第 12 章 神经康复的难处，是从「没变化」里看出变化：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/12-shenjing-xitong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、五种病各自要盯的风险数、足部检查几条，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 12;
const SLUG = '12-shenjing-xitong';
const TITLE = '神经康复的难处，是从「没变化」里看出变化';

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

/** 周围神经病的足部检查四条（按正文写死的四项动作计） */
function footChecks(text) {
  const items = ['每日检查双足', '试水温', '鞋内检查', '禁止使用热水袋'];
  const hit = items.filter((i) => text.includes(i));
  if (hit.length !== items.length) throw new Error('正文里足部检查的四条已改写');
  return hit.length;
}

/** 自主神经反射异常的典型表现条数（正文四种，诱因条数正文与考核项说法不一，故只算表现） */
function autonomicSigns(text) {
  const f = text.match(/它的典型表现是突发的剧烈头痛，伴([^，。]+)，常见诱因是/);
  if (!f) throw new Error('正文里找不到自主神经反射异常段');
  return { features: f[1].split('、').filter(Boolean).length };
}

function summarize(text = readDoc()) {
  const disease = tableShape(text, '| 病种 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    disease,
    priorityRisks: disease.rows * 2,
    foot: footChecks(text),
    autonomic: autonomicSigns(text),
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
  console.log(`${s.disease.rows} 种病 ×（首先要盯／其次要盯）= ${s.priorityRisks} 条风险，交接第一句只放「首先要盯的」`);
  console.log(`足部检查 ${s.foot} 条；自主神经反射异常的典型表现 ${s.autonomic.features} 条`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明观察要点，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, footChecks, autonomicSigns, summarize };
