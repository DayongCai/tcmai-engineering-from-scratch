#!/usr/bin/env node
/**
 * 骨伤康复评定 · 第 3 章 平衡不好的人不是站不住，是他不知道自己正在站不住
 * 正文: departments/04-gushang/15-gushang-kangfu-pingding/chapters/03-pingheng-butai/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md。汉字数、节数、平衡分级表的行与列、
 * 步态分期观察条目、结论要落的三个判断全部从正文现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 3;
const SLUG = '03-pingheng-butai';
const TITLE = '平衡不好的人不是站不住，是他不知道自己正在站不住';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

const numbered = (heads) =>
  heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h) && !h.includes('代价与边界'));

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

function section(text, keyword) {
  const blocks = text.split(/^##\s+/m).slice(1);
  const hit = blocks.find((b) => b.split(/\r?\n/)[0].includes(keyword));
  return hit || '';
}

const bullets = (block) => block.split(/\r?\n/).filter((l) => /^-\s+\S/.test(l.trim())).length;
const items = (block) => block.split(/\r?\n/).filter((l) => /^\d+\.\s+\S/.test(l.trim())).length;

function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)].sort() };
}

const bold = (text, term) => (text.match(new RegExp(`\\*\\*${term}\\*\\*`, 'g')) || []).length;

/** 本章可数对象：三路感觉输入、平衡三级、步态观察条目、结论三个判断 */
function chapterFacts(text) {
  const sensory = ['视觉', '前庭', '本体感觉'].filter((t) => text.includes(t)).length;
  const levelTable = tables(text).find((t) => t.head.join('').includes('常用工具'));
  const gaitObs = bullets(section(text, '步态：先看分期'));
  const decisions = ['能不能独自行走', '能不能应对扰动', '需要什么'].filter((t) => bold(text, t) >= 1).length;
  const bottom = section(text, '代价与边界');
  return {
    sensory: sensory,
    levels: levelTable ? levelTable.rows : 0,
    levelCols: levelTable ? levelTable.head.length : 0,
    gaitObs,
    decisions,
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
  console.log(`  感觉输入    ${s.sensory} 路`);
  console.log(`  平衡分级    ${s.levels} 级 × ${s.levelCols} 列`);
  console.log(`  步态观察    ${s.gaitObs} 条`);
  console.log(`  结论判断    ${s.decisions} 个`);
  console.log(`  边界条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文任一节、表、条目变动，重跑本脚本即可看到新值。');
  console.log('※ 本章不给量表条目、计分方法与跌倒风险判读阈值：阈值受年龄、病程、环境与合并症影响。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC,
  readDoc, headings, numbered, tables, section, bullets, items, citations, bold, chapterFacts, hanzi, stats, main,
};
