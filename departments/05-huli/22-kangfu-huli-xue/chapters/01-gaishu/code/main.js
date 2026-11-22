#!/usr/bin/env node
/**
 * 康复护理学 · 第 1 章 康复护理管的是功能，不是病：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/01-gaishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格与正文里那道转移人力差算式，全部现算。
 * 手打的数字会在正文修订后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const SLUG = '01-gaishu';
const TITLE = '康复护理管的是功能，不是病';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc(file = DOC) {
  return fs.readFileSync(file, 'utf8');
}

/** 正文汉字数：只数汉字，markdown 符号与英文不计 */
function countHanzi(text) {
  return (text.match(HANZI) || []).length;
}

/** 小节：二级标题（## ）列表 */
function sections(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

/** 表格：以分隔行（|---|）的条数计表，以竖线开头的行计行 */
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

/** 正文第一节自己给出的算式：一个白班 8 次起身 × 两人差 2 人·次 = 16 人·次 */
function transferGap(text) {
  const m = text.match(/(\d+)\s*次\s*×\s*(\d+)\s*人·次\s*=\s*(\d+)\s*人·次/);
  if (!m) throw new Error('正文里找不到转移人力差算式，正文是否已改写？');
  const trips = Number(m[1]);
  const perTrip = Number(m[2]);
  const stated = Number(m[3]);
  return { trips, perTrip, stated, computed: trips * perTrip, agrees: trips * perTrip === stated };
}

function summarize(text = readDoc()) {
  const hz = countHanzi(text);
  const secs = sections(text);
  const tb = tables(text);
  const gap = transferGap(text);
  return { hanzi: hz, sections: secs, tables: tb, gap };
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
  console.log(
    `转移人力差：${s.gap.trips} 次 × ${s.gap.perTrip} 人·次 = ${s.gap.computed} 人·次` +
      `（正文写 ${s.gap.stated}，${s.gap.agrees ? '一致' : '不一致'}）`
  );
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明记录口径，不构成护理判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, transferGap, summarize };
