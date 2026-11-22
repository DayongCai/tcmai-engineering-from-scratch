#!/usr/bin/env node
/**
 * 康复护理学 · 第 2 章 可塑性有前提，不是一句安慰话：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/02-lilun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、分期数与四个阶段产出，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const SLUG = '02-lilun';
const TITLE = '可塑性有前提，不是一句安慰话';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ'];

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

/** 分期数：正文列出的罗马数字期别（Ⅰ–Ⅵ） */
function stageCount(text) {
  return ROMAN.filter((r) => text.includes(r)).length;
}

/** 四个阶段产出：软瘫期「不恶化」、痉挛期「不固化」、恢复期「能用上」、后遗症期「不失能」 */
function stageOutputs(text) {
  const out = [];
  for (const m of text.matchAll(/([\u4e00-\u9fff]{1,4})期护理的产出是「([\u4e00-\u9fff]{2,4})」/g)) {
    out.push({ stage: `${m[1]}期`, output: m[2] });
  }
  return out;
}

function summarize(text = readDoc()) {
  const secs = sections(text);
  const tb = tables(text);
  const stages = stageCount(text);
  const outputs = stageOutputs(text);
  return {
    hanzi: countHanzi(text),
    sections: secs,
    tables: tb,
    stages,
    perStagePoints: 3,
    cells: stages * 3,
    outputs,
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
  console.log(`分期 ${s.stages} 期 × 每期 3 条要点（表现／护理重点／不能做）= ${s.cells} 格`);
  console.log('各期产出：');
  for (const o of s.outputs) console.log(`  ${o.stage} → ${o.output}`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明护理重点，不构成评定或训练依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, stageCount, stageOutputs, summarize };
