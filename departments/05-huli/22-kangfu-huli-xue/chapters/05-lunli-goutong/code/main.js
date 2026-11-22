#!/usr/bin/env node
/**
 * 康复护理学 · 第 5 章 同意不是签个字，是让他知道可以说不：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/05-lunli-goutong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、告知项数与拒绝情形的记录要求，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const SLUG = '05-lunli-goutong';
const TITLE = '同意不是签个字，是让他知道可以说不';

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

/** 告知五项：正文以「一是／二是／…／五是」列出 */
function consentItems(text) {
  const seg = text.match(/一是做什么[\s\S]*?五是记录怎么用/);
  if (!seg) throw new Error('正文里找不到告知五项的列举，正文是否已改写？');
  return (seg[0].match(/[一二三四五]是/g) || []).length;
}

/** 拒绝与撤回情形表：数出正文列了几种情形 */
function refusalRows(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith('| 情形 |'));
  if (start < 0) throw new Error('正文里找不到拒绝情形表，正文是否已改写？');
  let n = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    if (/^\|[\s:|-]+\|$/.test(lines[i])) continue;
    n += 1;
  }
  return n;
}

function summarize(text = readDoc()) {
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    consent: consentItems(text),
    refusals: refusalRows(text),
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
  console.log(`一次完整告知要说的 ${s.consent} 件事（缺一项，同意就不完整）`);
  console.log(`拒绝与撤回的情形 ${s.refusals} 种，每种都要「记录什么／不做什么／通知谁」三列齐`);
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明告知与记录口径，不构成法律意见或伦理裁定。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, consentItems, refusalRows, summarize };
