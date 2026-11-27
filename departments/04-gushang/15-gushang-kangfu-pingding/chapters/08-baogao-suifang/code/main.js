#!/usr/bin/env node
/**
 * 骨伤康复评定 · 第 8 章 报告是写给三个月后的自己看的，不是写给今天签字的人看的
 * 正文: departments/04-gushang/15-gushang-kangfu-pingding/chapters/08-baogao-suifang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：本脚本只读本目录的 docs/zh.md。汉字数、节数、报告四段、最小数据集条目、
 * 动机性表现形态与伦理四条全部从正文现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 8;
const SLUG = '08-baogao-suifang';
const TITLE = '报告是写给三个月后的自己看的，不是写给今天签字的人看的';
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

/** 本章可数对象：报告四段、最小数据集六项、动机性表现四型、伦理四条 */
function chapterFacts(text) {
  const segments = ['现状', '基线', '变化', '下一步'].filter((t) => boldHas(text, t));
  const dataset = bullets(section(text, '交接'));
  const motives = ['症状夸大', '症状低估', '非器质性表现', '用力不足'].filter((t) => boldHas(text, t));
  const ethics = ['知情同意', '隐私与信息分级', '告知义务', '不作超范围判断'].filter((t) => boldHas(text, t));
  const bottom = section(text, '代价与边界');
  return {
    reportSegments: segments.length,
    segmentNames: segments,
    datasetItems: dataset,
    motivationForms: motives.length,
    ethicsItems: ethics.length,
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
  console.log(`  报告结构    ${s.reportSegments} 段（${s.segmentNames.join('、')}）`);
  console.log(`  最小数据集  ${s.datasetItems} 项`);
  console.log(`  动机性表现  ${s.motivationForms} 型`);
  console.log(`  伦理条目    ${s.ethicsItems} 条`);
  console.log(`  边界条目    ${s.boundaries} 条`);
  console.log(`  免责声明    ${s.disclaimer ? '有' : '缺'}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文任一节、条目变动，重跑本脚本即可看到新值。');
  console.log('※ 本章不给报告的法定格式、伤残评定标准与劳动能力鉴定口径；动机性表现的定性属专业评估范畴。');
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
