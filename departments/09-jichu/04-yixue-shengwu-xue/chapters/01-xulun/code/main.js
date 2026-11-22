#!/usr/bin/env node
/**
 * 医学生物学 · 第 1 章 绪论：分层的账，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/01-xulun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：四层的章节覆盖、细胞总数与基因数的比值、细胞类型与基因数的比值，
 * 都从本章正文读出后计算。正文改版后重跑即可复现；手打的数字会静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '1';
const SLUG = '01-xulun';
const TITLE = '这门课不是细胞学与遗传学的拼盘，是一条从结构追到变异的链';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['存在性', '过程性', '可控性', '来源性', '结构判据', '功能判据', '变异判据', '常引口径', '禀赋'];

function readDoc(file) {
  return fs.readFileSync(file || DOC, 'utf8');
}

/** 「## 」二级标题，按出现顺序 */
function sections(text = readDoc()) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function hanzi(text = readDoc()) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

/** 本章的「四层」表：层 / 判断依据 / 对应章节 */
function layerTable(text = readDoc()) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    const m = cells[3].match(/^(\d+)(?:[–-](\d+))?$/);
    if (!m) continue;
    rows.push({
      layer: cells[0],
      basis: cells[1],
      evidence: cells[2],
      from: Number(m[1]),
      to: Number(m[2] || m[1]),
    });
  }
  return rows;
}

/** 把四层的章节区间展开，检查是否恰好铺满第 2–16 章、无重叠 */
function layerCoverage(rows = layerTable()) {
  const seen = new Map();
  const overlaps = [];
  for (const r of rows) {
    for (let n = r.from; n <= r.to; n += 1) {
      if (seen.has(n)) overlaps.push(n);
      else seen.set(n, r.layer);
    }
  }
  const numbers = [...seen.keys()].sort((a, b) => a - b);
  const missing = [];
  for (let n = 2; n <= 16; n += 1) if (!seen.has(n)) missing.push(n);
  return { covered: numbers.length, min: numbers[0], max: numbers[numbers.length - 1], missing, overlaps };
}

/** 正文里的中文数字量词，只认本章出现的三个口径 */
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function cnNumber(text) {
  if (/^\d+$/.test(text)) return Number(text);
  if (text === '十') return 10;
  if (/^十[一二三四五六七八九]$/.test(text)) return 10 + CN[text[1]];
  if (/^[一二三四五六七八九]十$/.test(text)) return CN[text[0]] * 10;
  if (/^[一二三四五六七八九]十[一二三四五六七八九]$/.test(text)) return CN[text[0]] * 10 + CN[text[2]];
  if (/百$/.test(text)) return CN[text[0]] * 100;
  if (/万$/.test(text)) return CN[text[0]] * 10000;
  return Number(text);
}

/** 从正文提取本章引用的三个数量级：细胞总数下限、细胞类型数、编码基因数 */
function scaleClaims(text = readDoc()) {
  const cells = text.match(/10\^(\d+)[–-]10\^(\d+)\s*个细胞/);
  const types = text.match(/([一二两三四五六七八九十百]+)种(?:上下|左右)?/);
  const genes = text.match(/([一二两三四五六七八九十]+万)个/);
  const typesM = types ? cnNumber(types[1]) : null;
  const genesM = genes ? cnNumber(genes[1]) : null;
  return {
    cellsLow: cells ? Math.pow(10, Number(cells[1])) : null,
    cellsHigh: cells ? Math.pow(10, Number(cells[2])) : null,
    types: typesM,
    genes: genesM,
    cellsPerGene: genesM ? Math.round(Math.pow(10, Number(cells[2])) / genesM) : null,
    cellsPerType: typesM ? Math.round(Math.pow(10, Number(cells[2])) / typesM) : null,
  };
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

/** 「代价与边界」一节的条目 */
function boundaries(text = readDoc()) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s*代价与边界/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+/.test(line)) out.push(line.replace(/^-\s+/, ''));
  }
  return out;
}

function summarize(text = readDoc()) {
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    layers: layerTable(text),
    coverage: layerCoverage(layerTable(text)),
    scales: scaleClaims(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 ' + s.boundaries.length + ' 条');
  console.log('');
  console.log('四层（正文表格现算）与章节归属：');
  for (const r of s.layers) {
    const span = r.from === r.to ? String(r.from) : r.from + '–' + r.to;
    console.log('  ' + r.layer + ' [' + span + ' 章] 判据：' + r.evidence);
  }
  const c = s.coverage;
  console.log('  → 覆盖第 ' + c.min + '–' + c.max + ' 章共 ' + c.covered + ' 章；缺口 '
    + (c.missing.length ? c.missing.join('、') : '无') + '；重叠 ' + (c.overlaps.length ? c.overlaps.join('、') : '无'));
  console.log('');
  const k = s.scales;
  console.log('数量级（正文常引口径，读后现算）：');
  console.log('  细胞总数 10^' + Math.log10(k.cellsLow) + '–10^' + Math.log10(k.cellsHigh)
    + ' · 细胞类型 ' + k.types + ' 种 · 编码基因 ' + k.genes + ' 个');
  console.log('  → 平均每个基因要解释的细胞数：' + k.cellsPerGene.toExponential(1)
    + '；每种细胞类型摊到的细胞数：' + k.cellsPerType.toExponential(1));
  console.log('  → 逐个数不可能，只能分层定位。');
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
  readDoc, sections, hanzi, layerTable, layerCoverage, cnNumber, scaleClaims,
  conceptHits, missing, boundaries, summarize,
};
