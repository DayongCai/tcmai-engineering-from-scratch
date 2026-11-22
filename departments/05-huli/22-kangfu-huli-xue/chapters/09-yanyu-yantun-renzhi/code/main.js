#!/usr/bin/env node
/**
 * 康复护理学 · 第 9 章 误吸的风险不在餐盘里，在喂饭的人手上：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/09-yanyu-yantun-renzhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、吞咽四期里能看见几期、停之后要做几步，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const SLUG = '09-yanyu-yantun-renzhi';
const TITLE = '误吸的风险不在餐盘里，在喂饭的人手上';

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

/** 读出表中数据行（去表头与分隔行），每行返回单元格数组 */
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

/** 吞咽四期里「能否直接观察」为「能」的期数 */
function observableStages(text) {
  const rows = tableRows(text, '| 期 |');
  return {
    total: rows.length,
    observable: rows.filter((r) => r[1] === '能').length,
    hidden: rows.filter((r) => r[1] !== '能').length,
  };
}

/** 咳后处置顺序：正文以「第一步…第五步」写死，按序数去重计数 */
function afterCoughSteps(text) {
  return new Set([...text.matchAll(/第([一二三四五])步/g)].map((m) => m[1])).size;
}

function summarize(text = readDoc()) {
  const stages = observableStages(text);
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    stages,
    bitePlan: tableRows(text, '| 时点 |').length,
    steps: afterCoughSteps(text),
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
  console.log(`吞咽 ${s.stages.total} 期：可直视 ${s.stages.observable} 期，看不见 ${s.stages.hidden} 期（咽期与食管期只能查后果）`);
  console.log(`进食时点 ${s.bitePlan} 个，咳后处置 ${s.steps} 步`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明观察口径，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableRows, observableStages, afterCoughSteps, summarize };
