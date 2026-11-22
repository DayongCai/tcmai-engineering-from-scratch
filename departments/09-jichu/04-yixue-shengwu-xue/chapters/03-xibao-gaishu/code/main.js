#!/usr/bin/env node
/**
 * 医学生物学 · 第 3 章 细胞的大小：表面积与体积的账，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/03-xibao-gaishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：把正文那张「半径—体积—V/S—相对膜面积」的表格读出来，
 * 用 4πr³/3 与 r/3 逐行复算，再算等体积下表面积能差几倍。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '3';
const SLUG = '03-xibao-gaishu';
const TITLE = '细胞的大小不是自由选择，是表面积与体积算出来的一道硬账';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['表面积与体积', '选择性膜', '单向依赖', '补偿', '微绒毛', '刷状缘', '极性', '预算分配', '常引口径'];

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

const num = (s) => Number(String(s).replace(/,/g, '').trim());

/** 表格里的数按它显示的小数位取容差：半位为界，避免把四舍五入当偏差 */
function slack(raw) {
  const s = String(raw).replace(/,/g, '').trim();
  const dec = (s.split('.')[1] || '').length;
  return 0.5 * 10 ** -dec * 1.02;
}

/** 正文的半径表：r / V / V·S⁻¹ / 相对膜面积 */
function radiusTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (!/^\d+(\.\d+)?$/.test(cells[0])) continue;
    rows.push({ r: num(cells[0]), v: num(cells[1]), vs: num(cells[2]), rel: num(cells[3]), raw: cells });
  }
  return rows;
}

const sphereVolume = (r) => (4 / 3) * Math.PI * r ** 3;
const sphereArea = (r) => 4 * Math.PI * r ** 2;
/** V/S = r/3；每单位体积可用的膜面积 S/V = 3/r */
const vsRatio = (r) => r / 3;
const areaPerVolume = (r) => 3 / r;

/** 逐行复算正文表格，返回偏差超过其显示精度的条目 */
function tableDrift(text = readDoc()) {
  return radiusTable(text)
    .map((row) => {
      const v = sphereVolume(row.r);
      const vs = vsRatio(row.r);
      const rel = areaPerVolume(row.r);
      const bad = [];
      if (Math.abs(v - row.v) > slack(row.raw[1])) bad.push('体积 表 ' + row.v + ' / 算 ' + v.toFixed(0));
      if (Math.abs(vs - row.vs) > slack(row.raw[2])) bad.push('V/S 表 ' + row.vs + ' / 算 ' + vs.toFixed(2));
      if (Math.abs(rel - row.rel) > slack(row.raw[3])) bad.push('相对面积 表 ' + row.rel + ' / 算 ' + rel.toFixed(2));
      return { r: row.r, ok: bad.length === 0, bad };
    })
    .filter((x) => !x.ok);
}

/** 等体积比较：半径翻倍时，一个大细胞换成 n 个小细胞，总表面积与单位体积膜面积的变化 */
function equalVolumeSwap(rBig, rSmall) {
  const n = (rBig / rSmall) ** 3;
  const surfaceRatio = (n * sphereArea(rSmall)) / sphereArea(rBig);
  return { n, surfaceRatio, areaRatio: areaPerVolume(rBig) / areaPerVolume(rSmall) };
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
    rows: radiusTable(text),
    drift: tableDrift(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 表格 '
    + s.rows.length + ' 行 · 边界 ' + s.boundaries.length + ' 条');
  console.log('');
  console.log('半径表复算（4πr³/3 与 r/3，读正文后逐行对照）：');
  for (const row of s.rows) {
    console.log('  r=' + String(row.r).padStart(4) + ' μm  体积 表' + String(row.v).padStart(7)
      + ' / 算' + sphereVolume(row.r).toFixed(0).padStart(7)
      + '  V/S 表' + String(row.vs).padStart(5) + ' / 算' + vsRatio(row.r).toFixed(2).padStart(5));
  }
  console.log('  → 超差行：' + (s.drift.length
    ? s.drift.map((d) => 'r=' + d.r + '（' + d.bad.join('；') + '）').join('、')
    : '无'));
  console.log('');
  const swap = equalVolumeSwap(10, 5);
  console.log('等体积换算（r=10 μm 换成 r=5 μm 的小细胞）：');
  console.log('  需 ' + swap.n + ' 个；总表面积比 ' + swap.surfaceRatio.toFixed(2)
    + '；单位体积可用膜面积比 ' + swap.areaRatio.toFixed(2));
  console.log('  → 半径每翻一倍，单位体积可用的膜面积减半；账不清，尺寸就会被这张表卡住。');
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
  readDoc, sections, hanzi, radiusTable, sphereVolume, sphereArea, vsRatio,
  areaPerVolume, tableDrift, equalVolumeSwap, conceptHits, missing, boundaries, summarize,
};
