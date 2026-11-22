#!/usr/bin/env node
/**
 * 医学生物学 · 第 4 章 细胞膜：厚度比与运输账，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/04-xibaomo/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：膜厚与细胞直径的比、球体表面积、三种运输方式的饱和性、四类失效，
 * 都从本章正文读出后计算。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '4';
const SLUG = '04-xibaomo';
const TITLE = '膜的本事不是「挡住」，是「让不该过的过得慢，让该过的过得快」';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['流动镶嵌', '疏水核心', '电化学梯度', '协同运输', '不对称', '流动性'];

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

const sphereArea = (r) => 4 * Math.PI * r ** 2;

/** 正文口径：直径 μm、膜厚 nm */
function geometry(text = readDoc()) {
  const d = text.match(/直径\s*([\d.]+)\s*μm/);
  const t = text.match(/厚度约\s*([\d.]+)\s*nm/);
  const claimed = text.match(/表面积约\s*([\d,]+)\s*μm²/);
  if (!d || !t) return null;
  const diameter = Number(d[1]);
  const thicknessNm = Number(t[1]);
  const areaFromDiameter = sphereArea(diameter / 2);
  const areaFromRadius = sphereArea(diameter);
  const shown = claimed ? Number(claimed[1].replace(/,/g, '')) : null;
  return {
    diameterUm: diameter,
    thicknessNm,
    thicknessRatio: Math.round((diameter * 1000) / thicknessNm),
    areaFromDiameter,
    areaFromRadius,
    shown,
    /** 正文那个面积数按哪个半径算得出来 */
    shownMatchesRadius: shown ? Math.abs(areaFromRadius - shown) / shown < 0.01 : null,
    shownMatchesDiameter: shown ? Math.abs(areaFromDiameter - shown) / shown < 0.01 : null,
  };
}

/** 三种运输方式表：方式 / 能量来源 / 能否逆梯度 / 饱和性 */
function transportTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 5) continue;
    if (/^方式$/.test(cells[0])) continue;
    rows.push({ mode: cells[0], energy: cells[1], uphill: cells[2], saturable: cells[3], example: cells[4] });
  }
  return rows;
}

/** 「六、」节里编号的四类失效 */
function failureClasses(text = readDoc()) {
  return lines(text)
    .filter((l) => /^\d+\.\s+\*\*[^*]+失效\*\*/.test(l.trim()))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
}

/** 「二、」节里三条硬约束 */
function lipidConstraints(text = readDoc()) {
  return lines(text)
    .filter((l) => /^\*\*第[一二三]条是/.test(l))
    .map((l) => (l.match(/\*\*第[一二三]条是([^*]+)\*\*/) || [, ''])[1].replace(/。$/, ''));
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
    geometry: geometry(text),
    transport: transportTable(text),
    failures: failureClasses(text),
    lipids: lipidConstraints(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  const g = s.geometry;
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('厚度账（正文口径现算）：');
  console.log('  细膜 ' + g.thicknessNm + ' nm 对直径 ' + g.diameterUm + ' μm → 只有直径的 1/'
    + g.thicknessRatio.toLocaleString('en-US'));
  console.log('  球体表面积（r=' + g.diameterUm / 2 + ' μm）：' + g.areaFromDiameter.toFixed(0) + ' μm²');
  console.log('  正文写的表面积 ' + g.shown + ' μm²，按 r=' + g.diameterUm + ' μm 才复现得出来；'
    + '与「直径 ' + g.diameterUm + ' μm」的口径不同源，此处只作口径对照，不作判读依据。');
  console.log('');
  console.log('三种运输（正文表格现算）：');
  for (const t of s.transport) {
    console.log('  ' + t.mode + ' · 能量：' + t.energy + ' · 饱和性：' + t.saturable);
  }
  console.log('  → 三问判别：耗能否、饱和否、方向随电位否。');
  console.log('');
  console.log('脂质三条硬约束：' + s.lipids.join('、'));
  console.log('四类失效：' + s.failures.join('、'));
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
  readDoc, sections, hanzi, geometry, transportTable, failureClasses, lipidConstraints,
  conceptHits, missing, boundaries, summarize,
};
