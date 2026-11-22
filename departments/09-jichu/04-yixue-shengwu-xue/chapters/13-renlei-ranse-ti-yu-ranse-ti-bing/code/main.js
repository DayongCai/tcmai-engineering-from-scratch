#!/usr/bin/env node
/**
 * 医学生物学 · 第 13 章 染色体与染色体病：可数化的账，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/13-renlei-ranse-ti-yu-ranse-ti-bing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：四十六条与二十三条的配对、2²³ 的自由组合数、核型分辨极限与
 * 基因长度相差几个数量级，都从本章正文读出后计算。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '13';
const SLUG = '13-renlei-ranse-ti-yu-ranse-ti-bing';
const TITLE = '核型分析做的事，是把一条连续的信息流切成四十六段可数的实物';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['核型', '显带', '同源染色体', '非整倍体', '三体', '平衡易位', '嵌合', '分辨极限'];

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
    else if (ch === '十' || ch === '百' || ch === '千') {
      value += (num || 1) * (ch === '十' ? 10 : ch === '百' ? 100 : 1000);
      num = 0;
    } else if (ch === '万' || ch === '亿') {
      value = (value + num) * (ch === '万' ? 1e4 : 1e8);
      num = 0;
    }
  }
  return value + num;
}

/** 染色体数、配对数与配子自由组合数 */
function karyotypeMath(text = readDoc()) {
  const pair = text.match(/二十三条成对，共([一二两三四五六七八九十百]+)条/);
  const total = pair ? cnToNumber(pair[1]) : null;
  const pairs = total ? total / 2 : null;
  return {
    total,
    pairs,
    combinations: pairs ? 2 ** pairs : null,
  };
}

/** 分辨极限（兆碱基对）与基因长度（千碱基对）落在几个数量级 */
function resolutionGap(text = readDoc()) {
  const band = text.match(/核型分析的分辨极限通常在([一二两三四五六七八九十])到([一二两三四五六七八九十])兆碱基对/);
  const gene = text.match(/一个基因的平均长度在([一二两三四五六七八九十百几]+)千碱基对/);
  if (!band || !gene) return null;
  const loMb = cnToNumber(band[1]);
  const hiMb = cnToNumber(band[2]);
  const fuzzy = /几/.test(gene[1]);
  const geneKb = fuzzy ? 10 : cnToNumber(gene[1]);
  const orders = [Math.log10((loMb * 1e6) / (geneKb * 1e3)), Math.log10((hiMb * 1e6) / (geneKb * 1e3))];
  return {
    loMb,
    hiMb,
    geneKb,
    geneZh: gene[1],
    fuzzy,
    ordersLow: Math.floor(orders[0]),
    ordersHigh: Math.ceil(orders[1]),
  };
}

/** 结构异常表：类型 / 实质 / 量的改变 / 典型表型 */
function structureTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line)) continue;
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (/^类型$/.test(cells[0])) continue;
    rows.push({ type: cells[0], essence: cells[1], dosage: cells[2], phenotype: cells[3] });
  }
  return rows;
}

/** 编号条目：某节里的 1. 2. 3. */
function numberedIn(text, headingRe) {
  const ls = lines(text);
  const start = ls.findIndex((l) => headingRe.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

/** 「五、」节嵌合的三变量：正文以一句加粗列出，按顿号与「以及」切开 */
function mosaicismVars(text = readDoc()) {
  const m = text.match(/\*\*([^*]*分布在哪些组织[^*]*)\*\*/);
  if (!m) return [];
  return m[1]
    .split(/[、，]|以及/)
    .map((x) => x.replace(/^这条染色体的/, '').trim())
    .filter(Boolean);
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
    karyo: karyotypeMath(text),
    gap: resolutionGap(text),
    structures: structureTable(text),
    trisomy: numberedIn(text, /^##\s*三、数目异常/),
    mosaicism: mosaicismVars(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  const k = s.karyo;
  const g = s.gap;
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('可数化的账（正文口径现算）：');
  console.log('  ' + k.total + ' 条染色体 = ' + k.pairs + ' 对；配子自由组合数 2^' + k.pairs
    + ' = ' + k.combinations.toLocaleString('en-US') + ' 种（不含交换带来的重组）');
  console.log('');
  console.log('分辨极限与基因尺度的落差：');
  console.log('  核型分辨 ' + g.loMb + '–' + g.hiMb + ' 兆碱基对 对 基因平均 ' + g.geneKb + ' 千碱基对');
  console.log('  → 相差 ' + g.ordersLow + '–' + g.ordersHigh + ' 个数量级：小于这条线的缺失重复，镜下看不见。');
  console.log('');
  console.log('结构异常（正文表格现算 ' + s.structures.length + ' 类）：');
  for (const r of s.structures) console.log('  ' + r.type + ' · 量的改变：' + r.dosage);
  console.log('  → 平衡与不平衡是两种完全不同的临床问题。');
  console.log('');
  console.log('三体可活的三条原因（' + s.trisomy.length + ' 条）：' + s.trisomy.join('、'));
  console.log('嵌合的三变量（' + s.mosaicism.length + ' 个）：' + s.mosaicism.join('、'));
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
  readDoc, sections, hanzi, cnToNumber, karyotypeMath, resolutionGap, structureTable,
  numberedIn, mosaicismVars, conceptHits, missing, boundaries, summarize,
};
