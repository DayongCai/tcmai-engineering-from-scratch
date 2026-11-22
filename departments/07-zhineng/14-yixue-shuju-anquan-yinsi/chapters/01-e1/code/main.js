#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 1 章 安全的第一道闸门不在防火墙，在字段定义
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/01-e1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：记录数、四个准标识的取值个数、组合空间与孤格比例，全部从本目录 docs/zh.md 现算。
 * 正文一改，数字跟着变；把手算结果打进代码，下一次补实就静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 1;
const SLUG = '01-e1';
const TITLE = '安全的第一道闸门不在防火墙，在字段定义';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const num = (s) => Number(String(s).replace(/[,{}\s]/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US');

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

/** markdown 表：以 |---| 定界行切分，返回 [{rows: string[][]}] */
function parseTables(text) {
  const out = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!/^\|/.test(t)) { cur = null; continue; }
    if (!cur) { cur = { rows: [] }; out.push(cur); }
    if (/^\|[\s:|-]*---[\s:|-]*\|$/.test(t)) continue;
    cur.rows.push(t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  }
  return out;
}

/** 本章的两个演算参数：记录数 N 与四个字段的取值个数 */
function params(text) {
  const rec = String(text).match(/设定一张\s*([\d,]+)\s*条记录/);
  if (!rec) throw new Error('正文缺少「设定一张 N 条记录」的演算设定，无法现算');
  const N = num(rec[1]);
  const dims = [];
  const re = /^[-*]\s*([^：\n]+)：([\d,]+)\s*个取值/gm;
  let m;
  while ((m = re.exec(String(text)))) dims.push({ name: m[1].trim(), values: num(m[2]) });
  if (dims.length < 4) throw new Error(`正文只列出 ${dims.length} 个字段取值，需 4 个才能复算组合空间`);
  return { N, dims };
}

/**
 * 组合枚举。cells 是字段取值的笛卡尔积；lambda 是平均每格记录数。
 * uniqueAsWritten 按正文第 2 节的写法 N·λe^{-λ} 计；
 * uniquePoisson 按「随机一条记录独占一格」的概率 e^{-λ} 计。
 * 两者相差一个 λ 因子，本脚本两个都打印，不改正文措辞。
 */
function model(text) {
  const { N, dims } = params(text);
  const cells = dims.reduce((a, d) => a * d.values, 1);
  const lambda = N / cells;
  const p0 = Math.exp(-lambda);
  const p1 = lambda * Math.exp(-lambda);
  return {
    N,
    dims,
    cells,
    lambda,
    p0,
    p1,
    uniqueAsWritten: N * p1,
    uniquePoisson: N * p0,
    atMostOne: cells * p1,
  };
}

function stats(text) {
  const t = String(text);
  const heads = headings(t);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(t),
    sections: heads.length,
    numbered: heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h)).length,
    tables: parseTables(t).length,
    drills: (t.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(t),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const m = model(text);

  console.log(`医学数据安全与隐私 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log('');
  console.log(`准标识字段（正文第二节的取值个数）：`);
  for (const d of m.dims) console.log(`  ${d.name.padEnd(6, '　')} ${String(d.values).padStart(4)} 个取值`);
  console.log('');
  console.log(`  记录数 N         ${fmt(m.N)}`);
  console.log(`  组合空间 cells   ${fmt(m.cells)}`);
  console.log(`  平均每格 λ       ${m.lambda.toFixed(3)}`);
  console.log(`  格内 0 人 P0     ${m.p0.toFixed(4)}`);
  console.log(`  格内 1 人 P1     ${m.p1.toFixed(4)}`);
  console.log('');
  console.log(`  正文写法 N·λe^{-λ}         ${fmt(Math.round(m.uniqueAsWritten))} 条`);
  console.log(`  独占一格 N·e^{-λ}          ${fmt(Math.round(m.uniquePoisson))} 条（${((m.uniquePoisson / m.N) * 100).toFixed(1)}%）`);
  console.log(`  格内不超过一人 cells·P1    ${fmt(Math.round(m.atMostOne))} 条`);
  console.log('');
  console.log('※ 同一式两种写法相差一个 λ 因子：正文第二节先给 N·λe^{-λ}，下一句「不超过一人约 4,495 条」用的正是 N·e^{-λ}。本脚本两个都印，不替正文改字。');
  console.log('※ 数字由本目录 docs/zh.md 现算；泊松近似假设格内均匀分布，真实数据有聚集，唯一性通常高于估算，这里给出的是下限。');
  console.log('※ 本章数值为演算设定，用于演示粒度与唯一性的关系，不构成合规意见或技术方案。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseTables, params, model, stats, hanzi, main };
