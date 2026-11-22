#!/usr/bin/env node
/**
 * 康复护理学 · 第 13 章 骨科康复先问骨头稳不稳，再问能不能动：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/13-gu-guanjie/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、负重四档、骨折三期与观察五项，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 13;
const SLUG = '13-gu-guanjie';
const TITLE = '骨科康复先问骨头稳不稳，再问能不能动';

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

/** 第一期观察五项：肿胀范围、皮肤张力、颜色、温度、末梢感觉与活动 */
function swellingChecks(text) {
  const m = text.match(/观察五项：([^。]+)。/);
  if (!m) throw new Error('正文里找不到观察五项');
  return m[1].split('、').filter(Boolean).length;
}

/** 髋置换三条禁令：屈髋不超直角、不内收过中线、不内旋 */
function hipBans(text) {
  const m = text.match(/教学口径的三条禁令是：([^。]+)。/);
  if (!m) throw new Error('正文里找不到三条禁令');
  return { stated: 3, parts: m[1].split('、').filter(Boolean).length };
}

function summarize(text = readDoc()) {
  const weight = tableShape(text, '| 档 |');
  const phases = tableShape(text, '| 期 |');
  const scenes = tableShape(text, '| 场景 |');
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    weight,
    phases,
    scenes,
    checks: swellingChecks(text),
    bans: hipBans(text),
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
  console.log(`负重 ${s.weight.rows} 档 ×（含义／护理执行／禁止）= ${s.weight.rows * 3} 格`);
  console.log(`骨折术后 ${s.phases.rows} 期，第一期观察 ${s.checks} 项；髋置换禁令 ${s.bans.parts} 条（正文标 ${s.bans.stated}）`);
  console.log(`日常场景 ${s.scenes.rows} 个，逐条给出正确做法与常见违规`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明负重口径，不构成康复处方。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, tableShape, swellingChecks, hipBans, summarize };
