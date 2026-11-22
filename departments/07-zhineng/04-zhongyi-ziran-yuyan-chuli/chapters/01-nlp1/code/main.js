#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 1 章 中医语料不是一种文本，是四种文本挤在同一列
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/01-nlp1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：文体表、三级噪声、四条「同一件事」的文体样本、异体字对，全部从本目录 docs/zh.md 现算。
 * 正文一改，表行数与配对就跟着变；把手打的数字写死，下一次补实就会静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 1;
const SLUG = '01-nlp1';
const TITLE = '中医语料不是一种文本，是四种文本挤在同一列';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 所有二级标题（含末节「代价与边界」） */
function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** markdown 表块：定界行 |---| 之上是表头，之下到空行为数据行 */
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

/** 文体表第一列：去掉括注与强调符，得到四种文体的名字 */
function genres(text) {
  return findTable(text, '文体')
    .rows.map((r) => r[0].replace(/（[^）]*）/g, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

/** 三级噪声：正文写作「第一级是**字符级**」 */
function noiseLevels(text) {
  const out = [];
  for (const m of text.matchAll(/第([一二三])级是\*\*([^*]+)\*\*/g)) {
    out.push({ order: m[1], name: m[2].trim() });
  }
  return out;
}

/** 四条「同一件事」的文体样本：以「经典：」「教材：」等开头、后接「」引文 */
function fourVoices(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(经典|教材|病历|标准)：.*?「([^」]+)」/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** 第一级噪声里的字对：正文写作 `鞕`与`硬` */
function variantPairs(text) {
  const pairs = [];
  for (const m of text.matchAll(/`([^`])`与`([^`])`/g)) pairs.push([m[1], m[2]]);
  return pairs;
}

function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)].sort() };
}

function stats() {
  const text = readDoc();
  const voices = fourVoices(text);
  const pairs = variantPairs(text);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tables: tableBlocks(text).length,
    genres: genres(text),
    levels: noiseLevels(text),
    voices: Object.keys(voices),
    voiceHit: Object.values(voices).filter((v) => v.includes('恶寒')).length,
    variants: pairs.length,
    variantHasYing: pairs.some(([a, b]) => a === '鞕' && b === '硬'),
    cites: citations(text).total,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字          ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  节 / 表       ${s.sections} / ${s.tables}`);
  console.log(`  文体          ${s.genres.length}：${s.genres.join('／')}`);
  console.log(`  噪声分级      ${s.levels.length}：${s.levels.map((l) => `第${l.order}级 ${l.name}`).join('／')}`);
  console.log(`  文体样本      ${s.voices.length} 条，其中含「恶寒」${s.voiceHit} 条（同一事实，四种语法）`);
  console.log(`  异体 / 通假对 ${s.variants} 对，含「鞕—硬」：${s.variantHasYing ? '是' : '否'}`);
  console.log(`  引文          ${s.cites} 处`);
  console.log('');
  console.log('四种文体样本（同一件事）：');
  for (const [k, v] of Object.entries(fourVoices(readDoc()))) console.log(`  ${k}：${v}`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算；正文改一行，重跑即见新值。');
  console.log('※ 本章只做文本工程讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, tableBlocks, splitRow, findTable,
  genres, noiseLevels, fourVoices, variantPairs, citations, hanzi, stats, main,
};
