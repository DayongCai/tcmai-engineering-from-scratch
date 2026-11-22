#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 2 章 分词切错的不是词，是概念边界
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/02-nlp2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：异体字表从正文表格读出，归一化与最大匹配都作用在正文给的例句上；
 * 改写位置、切分结果、三种切法的代价，全部现算，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 2;
const SLUG = '02-nlp2';
const TITLE = '分词切错的不是词，是概念边界';
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

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function tableBlocks(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|[\s:|-]*---[\s:|-]*\|$/.test(lines[i].trim())) continue;
    const header = i > 0 ? splitRow(lines[i - 1]) : [];
    const rows = [];
    let j = i + 1;
    while (j < lines.length && /^\|/.test(lines[j].trim())) {
      rows.push(splitRow(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
  }
  return out;
}

function findTable(text, key) {
  const tb = tableBlocks(text).find((t) => t.header.some((h) => h.includes(key)));
  if (!tb) throw new Error(`正文里没有表头含「${key}」的表`);
  return tb;
}

/** 异体 / 通假表：原字、今字、关系、例 */
function variantTable(text) {
  return findTable(text, '原字').rows.map((r) => ({ from: r[0], to: r[1], relation: r[2], example: r[3] }));
}

/** 由异体表构造归一映射：原文写法进映射，不改正文 */
function normTable(rows) {
  const map = {};
  for (const r of rows) {
    if (r.from && r.to) map[r.from] = r.to;
  }
  return map;
}

/** 单字归一，返回归一文本与改写位置；与正文示例同口径 */
function normalize(s, table) {
  const out = [];
  const marks = [];
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (Object.prototype.hasOwnProperty.call(table, ch)) {
      out.push(table[ch]);
      marks.push({ index: i, from: ch, to: table[ch] });
    } else {
      out.push(ch);
    }
  }
  return { text: out.join(''), marks };
}

/** 最大匹配：词典按长度降序，未命中处落单字，宁可留残片也不硬拼 */
function maxMatch(s, dict) {
  const words = [...new Set(dict)].sort((a, b) => b.length - a.length);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const hit = words.find((w) => w.length > 0 && s.startsWith(w, i));
    if (hit) {
      out.push(hit);
      i += hit.length;
    } else {
      out.push(s[i]);
      i += 1;
    }
  }
  return out;
}

/** 正文里出现过的术语，作为词典的种子（不引入正文之外的词） */
function termDict(text) {
  const candidates = ['头项强痛', '恶寒', '脉浮', '麻黄汤', '麻黄', '太阳病', '头项'];
  const dict = candidates.filter((w) => text.includes(w));
  if (!dict.includes('头项强痛') || !dict.includes('麻黄汤')) {
    throw new Error('正文已不含「头项强痛」或「麻黄汤」，词典种子失效');
  }
  return dict;
}

/** 三种切法表 */
function grammars(text) {
  return findTable(text, '切法').rows.map((r) => ({ name: r[0], sample: r[1], good: r[2], bad: r[3] }));
}

function stats() {
  const text = readDoc();
  const table = normTable(variantTable(text));
  const dict = termDict(text);
  const demo = normalize('大便鞕，欬逆上气，十一藏', table);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    variants: Object.keys(table).length,
    table,
    dict,
    normalize: demo,
    match1: maxMatch('头项强痛而恶寒', dict),
    match2: maxMatch('麻黄汤去麻黄', dict),
    grammars: grammars(text),
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  异体 / 通假      ${s.variants} 对：${Object.entries(s.table).map(([a, b]) => `${a}→${b}`).join(' ')}`);
  console.log(`  切法            ${s.grammars.length} 种：${s.grammars.map((g) => g.name).join('／')}`);
  console.log('');
  console.log(`归一示例：大便鞕，欬逆上气，十一藏`);
  console.log(`       → ${s.normalize.text}（改写 ${s.normalize.marks.length} 处）`);
  for (const m of s.normalize.marks) console.log(`         ${m.index}: ${m.from} → ${m.to}`);
  console.log('');
  console.log(`最大匹配（词典 ${s.dict.length} 条）：`);
  console.log(`  头项强痛而恶寒 → ${s.match1.join(' / ')}`);
  console.log(`  麻黄汤去麻黄   → ${s.match2.join(' / ')}`);
  console.log('');
  console.log('三种切法的代价：');
  for (const g of s.grammars) console.log(`  ${g.name}：${g.bad}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算；改一条异体或一条词典种子，重跑即见新值。');
  console.log('※ 本章只做文本工程讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, tableBlocks, splitRow, findTable,
  variantTable, normTable, normalize, maxMatch, termDict, grammars, hanzi, stats, main,
};
