#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 1 章 数据不是捡来的，是签过字的
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/01-s1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：抽取层的精确率与召回率、钱与克的换算、截断纵轴的柱高比，全部从本目录正文读出来再重算；
 * 重算结果必须能在正文里找到同一个数，找不到就抛错。手打的数字会在正文改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 1;
const SLUG = '01-s1';
const TITLE = '数据不是捡来的，是签过字的';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function tables(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l)).length;
}

function citations(text) {
  const all = [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, books: [...new Set(all)] };
}

/** 三层抽取：每层的精确率与召回率，按正文顺序读 */
function precisionRecall(text) {
  return [...text.matchAll(/精确率\s*([\d.]+)、召回\s*([\d.]+)/g)].map((m) => ({
    p: Number(m[1]),
    r: Number(m[2]),
  }));
}

const f1 = (p, r) => (2 * p * r) / (p + r);

/** 旧制 1 钱折多少克（正文「1 钱 ≈ 3.73 g」） */
function gramPerQian(text) {
  const m = text.match(/1 钱 ≈ ([\d.]+) g/);
  if (!m) throw new Error('正文里没有「1 钱 ≈ … g」的换算常数');
  return Number(m[1]);
}

/** 截断纵轴：真实两率与起点，返回柱高比 */
function truncation(text) {
  const m = text.match(/治愈率从\s*(\d+)%\s*升到\s*(\d+)%，若 y 轴从\s*(\d+)\s*起/);
  if (!m) throw new Error('正文里没有截断纵轴的算例');
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  const base = Number(m[3]);
  return { lo, hi, base, ratio: (hi - base) / (lo - base) };
}

function matchRate(text) {
  const m = text.match(/([\d.]+)\s*万条就诊记录去重后得到\s*([\d.]+)\s*万名患者/);
  if (!m) throw new Error('正文里没有患者主索引的算例');
  const records = Number(m[1]) * 10000;
  const patients = Number(m[2]) * 10000;
  return { records, patients, perPatient: records / patients };
}

function compute(text) {
  const pr = precisionRecall(text);
  if (pr.length < 3) throw new Error(`正文只读到 ${pr.length} 组精确率／召回率，应为 3 层`);
  const unit = gramPerQian(text);
  const grams = 3 * unit; // 「甘草三钱」
  const coarse = 9; // 按 1 钱 = 3 g 粗折
  return {
    layers: pr.map((x, i) => ({
      name: ['规则·舌质', '词典·药名', '模型·证候'][i],
      ...x,
      f1: f1(x.p, x.r),
    })),
    unit,
    grams,
    coarse,
    deviation: (grams - coarse) / coarse,
    trunc: truncation(text),
    index: matchRate(text),
  };
}

/** 重算值必须回到正文：找不到就说明正文改过而代码没跟上 */
function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const approx = [...text.matchAll(/\\approx(0\.\d+)/g)].map((m) => Number(m[1]));
  const near = (v) => approx.some((a) => Math.abs(a - v) < 2e-3);
  need(near(c.layers[1].f1), `药名层 F1 重算为 ${c.layers[1].f1.toFixed(4)}，正文的近似值里找不到对应数`);
  need(near(c.layers[2].f1), `证候层 F1 重算为 ${c.layers[2].f1.toFixed(4)}，正文的近似值里找不到对应数`);
  need(text.includes(c.grams.toFixed(1)), `三钱折 ${c.grams.toFixed(1)} g，正文里找不到这个数`);
  need(text.includes(`${Math.round(c.deviation * 100)}%`), `粗折偏差 ${Math.round(c.deviation * 100)}%，正文里找不到`);
  need(`${c.trunc.ratio}:1` === '2:1' && text.includes(`${c.trunc.ratio}:1`), `柱高比重算为 ${c.trunc.ratio}:1，正文里找不到`);
  need(c.index.records === 100000 && c.index.patients === 32000, '患者主索引的条数与人数与正文不一致');
  return c;
}

function stats(text) {
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tables: tables(text),
    cites: citations(text).total,
    drills: (text.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const c = verify(text);

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  节          ${s.sections}`);
  console.log(`  表          ${s.tables}`);
  console.log(`  引文        ${s.cites} 处`);
  console.log(`  演算设定    ${s.drills} 处`);
  console.log('');
  console.log('三层抽取的 P／R／F1（由正文的精确率与召回率重算）：');
  for (const l of c.layers) {
    console.log(`  ${l.name}   P=${l.p.toFixed(2)}  R=${l.r.toFixed(2)}  F1=${l.f1.toFixed(3)}`);
  }
  console.log('');
  console.log(`单位：1 钱 = ${c.unit} g；甘草三钱 = ${c.grams.toFixed(2)} g，按 3 g 粗折 ${c.coarse} g，偏差 ${Math.round(c.deviation * 100)}%。`);
  console.log(`截断：${c.trunc.lo}% → ${c.trunc.hi}%，起点 ${c.trunc.base}%，柱高比 ${c.trunc.ratio}:1（视觉翻倍，实际 2 个百分点）。`);
  console.log(`主索引：${c.index.records.toLocaleString('en-US')} 条记录 → ${c.index.patients.toLocaleString('en-US')} 人，人均 ${c.index.perPatient.toFixed(2)} 条。`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：P／R 一改，F1 与偏差跟着变，重跑即可看到新值。');
  console.log('※ 本章数值为演算设定，用于演示治理环节的量化关系，不对应任何医院的真实数据。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  readDoc,
  headings,
  tables,
  citations,
  hanzi,
  precisionRecall,
  f1,
  compute,
  verify,
  stats,
  main,
};
