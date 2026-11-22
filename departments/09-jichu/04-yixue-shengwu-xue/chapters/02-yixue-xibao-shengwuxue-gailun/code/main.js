#!/usr/bin/env node
/**
 * 医学生物学 · 第 2 章 学科定位：手段的分辨极限，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/02-yixue-xibao-shengwuxue-gailun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：四种手段的盲区条数、光镜与电镜的分辨比、四类可测状态与三个入口的条数，
 * 都从本章正文读出后计算。正文改版后重跑即可复现；手打的数字会静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '2';
const SLUG = '02-yixue-xibao-shengwuxue-gailun';
const TITLE = '这门学科划的不是「细胞」这条线，是「可测的细胞状态」这条线';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['可测状态', '组成状态', '形态状态', '动态状态', '命运状态', '细胞学说', '盲区', '代表性', '常引口径'];

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

/** 四种手段表：手段 / 能给什么 / 不能给什么 / 典型盲区 */
function methodTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.replace(/\*\*/g, '').trim());
    if (cells.length !== 4) continue;
    if (/^手段$/.test(cells[0])) continue;
    rows.push({ tool: cells[0], gives: cells[1], denies: cells[2], blind: cells[3] });
  }
  return rows;
}

/** 从正文读出两种显微镜的分辨下限（μm / nm），换算成比值 */
function resolution(text = readDoc()) {
  const light = text.match(/光学显微镜的分辨下限约\s*([\d.]+)\s*μm/);
  const em = text.match(/电子显微镜约\s*([\d.]+)\s*nm/);
  if (!light || !em) return null;
  const lightNm = Number(light[1]) * 1000; // 1 μm = 1000 nm
  const emNm = Number(em[1]);
  return {
    lightUm: Number(light[1]),
    emNm,
    ratio: Math.round(lightNm / emNm),
    orders: Math.round(Math.log10(lightNm / emNm)),
  };
}

/** 「一、」节里以「**X状态**」开头的条目 —— 四类可测状态 */
function stateClasses(text = readDoc()) {
  return lines(text)
    .filter((l) => /^-\s+\*\*[^\n]*状态\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
}

/** 「六、」节里起首的「**X入口。**」段落 —— 三个入口 */
function entryPoints(text = readDoc()) {
  return lines(text)
    .filter((l) => /^\s*-?\s*\*\*[^\n]*入口。\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1].replace(/。$/, ''));
}

/** 「四、」节里编号的体外偏差条目 */
function inVitroBiases(text = readDoc()) {
  return lines(text)
    .filter((l) => /^\d+\.\s+\*\*[^*]+偏差\*\*/.test(l.trim()))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
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
    methods: methodTable(text),
    resolution: resolution(text),
    states: stateClasses(text),
    entries: entryPoints(text),
    biases: inVitroBiases(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('四种手段（正文表格现算）：');
  for (const m of s.methods) console.log('  ' + m.tool + ' → 盲区：' + m.blind);
  console.log('');
  const r = s.resolution;
  console.log('分辨比（正文口径现算）：光镜 ' + r.lightUm + ' μm 对电镜 ' + r.emNm + ' nm → 相差 '
    + r.ratio + ' 倍，即 ' + r.orders + ' 个数量级。');
  console.log('  → 恰好是「看到有空泡」与「看到是内质网还是线粒体」之间的差距。');
  console.log('');
  console.log('对象的结构（正文现算）：');
  console.log('  可测状态 ' + s.states.length + ' 类：' + s.states.join('、'));
  console.log('  进入细胞层的入口 ' + s.entries.length + ' 个：' + s.entries.join('、'));
  console.log('  体外偏差 ' + s.biases.length + ' 类：' + s.biases.join('、'));
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
  readDoc, sections, hanzi, methodTable, resolution, stateClasses, entryPoints,
  inVitroBiases, conceptHits, missing, boundaries, summarize,
};
