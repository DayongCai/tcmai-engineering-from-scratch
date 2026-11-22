#!/usr/bin/env node
/**
 * 康复护理学 · 第 4 章 评估的用处是把「他说不行」换成「卡在哪一步」：本章正文的自身统计
 * 课程: departments/05-huli/22-kangfu-huli-xue/chapters/04-pinggu-jichu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读本章 docs/zh.md：汉字、小节、表格、五套记录与 Barthel 分档界线，全部现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const SLUG = '04-pinggu-jichu';
const TITLE = '评估的用处是把「他说不行」换成「卡在哪一步」';

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

/** 五套记录：肌力、关节活动度、日常生活活动、平衡、疼痛与感觉 */
function toolCount(text) {
  const tools = ['徒手肌力分级', '量角器', 'Barthel', 'Berg', '疼痛与感觉'];
  return tools.filter((t) => text.includes(t));
}

/** Barthel 分档界线：正文给出 20／40／60 三条界线，切出四档 */
function barthelBands(text) {
  const m = text.match(
    /低于\s*(\d+)\s*完全依赖、(\d+)[–\-](\d+)\s*严重依赖、(\d+)[–\-](\d+)\s*中度、高于\s*(\d+)\s*基本自理/
  );
  if (!m) throw new Error('正文里找不到 Barthel 分档句，正文是否已改写？');
  const cut = [Number(m[1]), Number(m[3]), Number(m[6])];
  return { bands: 4, cut, span: cut[cut.length - 1] - cut[0] };
}

function summarize(text = readDoc()) {
  return {
    hanzi: countHanzi(text),
    sections: sections(text),
    tables: tables(text),
    tools: toolCount(text),
    barthel: barthelBands(text),
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
  console.log(`五套记录命中 ${s.tools.length} 套：${s.tools.join('、')}`);
  console.log(
    `Barthel 分档：界线 ${s.barthel.cut.join('、')} 三条 → ${s.barthel.bands} 档（${s.barthel.cut[0]} 至 ${s.barthel.cut[2]} 之间跨 ${s.barthel.span} 分）`
  );
  console.log('');
  console.log('※ 教学样例：数字由 docs/zh.md 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于说明记录口径，不构成评定结论。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, SLUG, TITLE, readDoc, countHanzi, sections, tables, toolCount, barthelBands, summarize };
