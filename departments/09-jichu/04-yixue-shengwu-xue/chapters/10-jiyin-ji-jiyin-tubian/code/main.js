#!/usr/bin/env node
/**
 * 医学生物学 · 第 10 章 基因与突变：密码的算术与后果分档，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/10-jiyin-ji-jiyin-tubian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：密码子总数、有义密码子与氨基酸之比、尺度五类与后果四档的条数，
 * 都从本章正文读出后计算。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '10';
const SLUG = '10-jiyin-ji-jiyin-tubian';
const TITLE = '基因不是一段密码，是一段带标点、带批注、还会被剪接的文本';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['调控区', '剪接信号', '非翻译区', '简并', '移码', '无义', '同义改变', '新发'];

function readDoc(file) {
  return fs.readFileSync(file || DOC, 'utf8');
}

function lines(text) {
  return text.split(/\r?\n/);
}

function sections(text = readDoc()) {
  return lines(text)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function hanzi(text = readDoc()) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

const DIGIT = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function cnToNumber(text) {
  const s = String(text).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  let value = 0;
  let num = 0;
  for (const ch of s) {
    if (DIGIT[ch] !== undefined) num = DIGIT[ch];
    else if (ch === '十' || ch === '百') {
      value += (num || 1) * (ch === '十' ? 10 : 100);
      num = 0;
    } else if (ch === '万' || ch === '亿') {
      value = (value + num) * (ch === '万' ? 1e4 : 1e8);
      num = 0;
    }
  }
  return value + num;
}

/** 遗传密码的算术：密码子总数、氨基酸种数、终止信号数 */
function codonMath(text = readDoc()) {
  const codons = text.match(/([一二两三四五六七八九十百]+)个密码子/);
  const aa = text.match(/([一二两三四五六七八九十百]+)种氨基酸/);
  const stops = text.match(/([一二两三四五六七八九十百]+)个终止信号/);
  if (!codons || !aa || !stops) return null;
  const total = cnToNumber(codons[1]);
  const amino = cnToNumber(aa[1]);
  const stop = cnToNumber(stops[1]);
  const sense = total - stop;
  return {
    total,
    amino,
    stop,
    sense,
    /** 每个氨基酸平均摊到几个密码子（冗余度） */
    redundancy: sense / amino,
    /** 4³ 是否复现密码子总数 */
    cube: 4 ** 3,
  };
}

/** 正文里的三列表格（尺度表与后果表），按表头区分 */
function threeColTables(text = readDoc()) {
  const tables = [];
  let current = null;
  for (const line of lines(text)) {
    if (!/^\|/.test(line)) {
      current = null;
      continue;
    }
    if (/^\|[\s\-:|]+\|$/.test(line)) continue; // 分隔行不打断表格
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 3) {
      current = null;
      continue;
    }
    if (!current) {
      current = { header: cells, rows: [] };
      tables.push(current);
      continue;
    }
    current.rows.push(cells);
  }
  return tables;
}

const scaleTable = (text = readDoc()) => threeColTables(text).find((t) => /尺度/.test(t.header[0]));
const effectTable = (text = readDoc()) => threeColTables(text).find((t) => /后果档/.test(t.header[0]));

/** 「二、」节密码的三条性质（编号条目） */
function codeProperties(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*二、遗传密码/.test(l));
  if (start < 0) return [];
  const ls = lines(text);
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

/** 「一、」节基因边界漏掉的三样 */
function geneBoundaryMissing(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*一、基因的边界/.test(l));
  if (start < 0) return [];
  const ls = lines(text);
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

function boundaries(text = readDoc()) {
  const ls = lines(text);
  const start = ls.findIndex((l) => /^##\s*代价与边界/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+/.test(line)) out.push(line.replace(/^-\s+/, ''));
  }
  return out;
}

function summarize(text = readDoc()) {
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    codon: codonMath(text),
    scales: scaleTable(text),
    effects: effectTable(text),
    properties: codeProperties(text),
    boundaryLoss: geneBoundaryMissing(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  const c = s.codon;
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('密码的算术（正文口径现算）：');
  console.log('  4³ = ' + c.cube + ' 个密码子；' + c.amino + ' 种氨基酸；' + c.stop + ' 个终止信号');
  console.log('  → 有义密码子 ' + c.sense + ' 个，平均每个氨基酸 ' + c.redundancy.toFixed(2) + ' 个密码子。');
  console.log('  → 冗余带来容错，也带来「同义是否无害」这个判断难题。');
  console.log('');
  console.log('基因边界漏掉的三样（正文现算 ' + s.boundaryLoss.length + ' 样）：' + s.boundaryLoss.join('、'));
  console.log('密码三条性质（' + s.properties.length + ' 条）：' + s.properties.join('、'));
  console.log('');
  if (s.scales) {
    console.log('突变五类（正文表格现算 ' + s.scales.rows.length + ' 类）：');
    for (const r of s.scales.rows) console.log('  ' + r[0] + '：' + r[2]);
  }
  console.log('');
  if (s.effects) {
    console.log('后果四档（正文表格现算 ' + s.effects.rows.length + ' 档）：');
    for (const r of s.effects.rows) console.log('  ' + r[0] + '：' + r[1]);
    console.log('  → 「无影响」是需要证据的判断，不是默认值。');
  }
  console.log('');
  console.log('判据词命中（正文现算）：');
  for (const x of s.concepts) console.log('  ' + (x.hits ? '✓' : '✗') + ' ' + x.term + '：' + x.hits);
  console.log('');
  console.log('边界（「代价与边界」一节，取前 3 条）：');
  s.boundaries.slice(0, 3).forEach((b) => console.log('  - ' + b));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TITLE, CONCEPTS,
  readDoc, sections, hanzi, cnToNumber, codonMath, threeColTables, scaleTable, effectTable,
  codeProperties, geneBoundaryMissing, conceptHits, missing, boundaries, summarize,
};
