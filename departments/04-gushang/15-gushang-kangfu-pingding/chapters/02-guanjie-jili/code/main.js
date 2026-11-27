#!/usr/bin/env node
/**
 * 骨伤康复评定 · 第 2 章 角度量得出来，力量量得出来，「够不够用」量不出来
 * 正文: departments/04-gushang/15-gushang-kangfu-pingding/chapters/02-guanjie-jili/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md。汉字数、节数、条目数、终末感的种类、
 * 任务分析的步骤全部从正文现算。正文一改，数字跟着变；把数字手打进代码，
 * 下一次修订就会静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 2;
const SLUG = '02-guanjie-jili';
const TITLE = '角度量得出来，力量量得出来，「够不够用」量不出来';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 二级标题全文 */
function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

/** 编号节：一、二、……；末节「代价与边界」不计入 */
const numbered = (heads) =>
  heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h) && !h.includes('代价与边界'));

/** 一张表 = 定界行 |---| + 紧随其后的数据行 */
function tables(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out = [];
  for (let i = 1; i < lines.length - 1; i += 1) {
    if (!/^\|[\s:|-]*-{3}[\s:|-]*\|$/.test(lines[i])) continue;
    const head = lines[i - 1].split('|').slice(1, -1).map((c) => c.trim());
    let rows = 0;
    let j = i + 1;
    while (j < lines.length && /^\|.*\|$/.test(lines[j]) && !/^\|[\s:|-]*-{3}/.test(lines[j])) {
      rows += 1;
      j += 1;
    }
    out.push({ head, rows });
    i = j - 1;
  }
  return out;
}

/** 某一节（按标题关键词定位）的正文块 */
function section(text, keyword) {
  const blocks = text.split(/^##\s+/m).slice(1);
  const hit = blocks.find((b) => b.split(/\r?\n/)[0].includes(keyword));
  return hit || '';
}

/** 块内的无序条目（- 开头）与有序条目（1. 开头） */
const bullets = (block) => block.split(/\r?\n/).filter((l) => /^-\s+\S/.test(l.trim())).length;
const items = (block) => block.split(/\r?\n/).filter((l) => /^\d+\.\s+\S/.test(l.trim())).length;

/** 引文：《书名》或《书名·篇名》 */
function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)].sort() };
}

/** 加粗术语的出现次数，形如 **骨性** */
const bold = (text, term) => (text.match(new RegExp(`\\*\\*${term}\\*\\*`, 'g')) || []).length;

/** 本章的四个可数对象：主动／被动三条判读、终末感五种、任务分析三步、边界条目 */
function chapterFacts(text) {
  const activePassive = bullets(section(text, '先分清量的是关节还是人'));
  const endFeelSection = section(text, '终末感');
  const endFeel = ['骨性', '软组织紧张', '痉挛', '空虚感', '弹簧样抵抗']
    .filter((t) => bold(endFeelSection, t) >= 1);
  const taskSection = section(text, '把角度换算成动作');
  const steps = (taskSection.match(/\*\*第[一二三四五六七八九十]+步/g) || []).length;
  const taskItems = items(taskSection);
  const bottom = section(text, '代价与边界');
  return {
    activePassiveRules: activePassive,
    endFeelTypes: endFeel.length,
    endFeelNames: endFeel,
    taskSteps: steps,
    taskItems,
    boundaries: bullets(bottom),
  };
}

function stats() {
  const text = readDoc();
  const heads = headings(text);
  const c = citations(text);
  const f = chapterFacts(text);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: heads.length,
    numbered: numbered(heads).length,
    tables: tables(text).length,
    cites: c.total,
    books: c.books,
    ...f,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  const fmt = (n) => n.toLocaleString('en-US');
  console.log(`骨伤康复评定 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log(`  引文        ${s.cites} 处 / ${s.books.length} 部`);
  console.log(`  主被动判读  ${s.activePassiveRules} 条`);
  console.log(`  终末感      ${s.endFeelTypes} 种（${s.endFeelNames.join('、')}）`);
  console.log(`  任务分析    ${s.taskSteps} 步`);
  console.log(`  边界条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文任一节、条目变动，重跑本脚本即可看到新值。');
  console.log('※ 本章不给正常活动度参考值、肌力分级判读标准与达标百分比：正常值随年龄、体型与测量方法变化。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC,
  readDoc, headings, numbered, tables, section, bullets, items, citations, bold, chapterFacts, hanzi, stats, main,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
