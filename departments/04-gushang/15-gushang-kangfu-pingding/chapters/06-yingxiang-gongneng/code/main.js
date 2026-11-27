#!/usr/bin/env node
/**
 * 骨伤康复评定 · 第 6 章 片子上的愈合有时间表，能不能负重没有
 * 正文: departments/04-gushang/15-gushang-kangfu-pingding/chapters/06-yingxiang-gongneng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md。汉字数、节数、三条时间线、量表按部位的清单、
 * 随访表的行与列全部从正文现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 6;
const SLUG = '06-yingxiang-gongneng';
const TITLE = '片子上的愈合有时间表，能不能负重没有';
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

const boldHas = (text, term) => new RegExp(`\\*\\*${term}`).test(text);

/** 本章可数对象：三条时间线、量表覆盖的部位数、随访表行列、三句报告措辞 */
function chapterFacts(text) {
  const timelines = ['结构线', '功能线', '任务线'].filter((t) => boldHas(text, t));
  const parts = ['肩', '肘', '腕手', '髋', '膝', '踝足', '脊柱'].filter((t) => boldHas(text, t));
  const grid = tables(text).find((t) => t.head.join('').includes('任务'));
  const phrases = ['「结构愈合良好」', '「功能恢复至某程度」', '「可以开始某类任务」']
    .filter((t) => boldHas(text, t));
  const bottom = section(text, '代价与边界');
  return {
    timelines: timelines.length,
    timelineNames: timelines,
    bodyParts: parts.length,
    gridRows: grid ? grid.rows : 0,
    gridCols: grid ? grid.head.length : 0,
    reportPhrases: phrases.length,
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
  console.log(`  时间线      ${s.timelines} 条（${s.timelineNames.join('、')}）`);
  console.log(`  量表部位    ${s.bodyParts} 个`);
  console.log(`  随访表      ${s.gridRows} 个时点 × ${s.gridCols} 列`);
  console.log(`  报告措辞    ${s.reportPhrases} 句`);
  console.log(`  边界条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文任一节、表、条目变动，重跑本脚本即可看到新值。');
  console.log('※ 本章只给量表名称与用途，不给条目、计分、分级与截断值；影像判读属具备资质人员的职责。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC,
  readDoc, headings, numbered, tables, section, bullets, items, citations, boldHas, chapterFacts, hanzi, stats, main,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
