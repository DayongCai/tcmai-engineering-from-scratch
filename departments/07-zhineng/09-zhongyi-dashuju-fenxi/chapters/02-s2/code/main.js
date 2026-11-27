#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 2 章 平均数是一句没说完的话
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/02-s2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：变异系数、加权均数、合计率、正态法参考区间、几何均数，全部由正文给出的原始数现算；
 * 每个结果都要能在正文里找到同一个数，找不到就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 2;
const SLUG = '02-s2';
const TITLE = '平均数是一句没说完的话';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

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

const citations = (text) => [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);

/** 味数：均值与标准差 */
function herbSpread(text) {
  const m = text.match(/平均\s*([\d.]+)\s*味药，标准差\s*([\d.]+)/);
  if (!m) throw new Error('正文缺处方味数的均数与标准差');
  return { mean: Number(m[1]), sd: Number(m[2]) };
}

function medianLine(text) {
  const m = text.match(/中位数\s*(\d+)，四分位距\s*(\d+)[–-](\d+)/);
  if (!m) throw new Error('正文缺中位数与四分位距');
  return { median: Number(m[1]), q1: Number(m[2]), q3: Number(m[3]), iqr: Number(m[3]) - Number(m[2]) };
}

/** 三家医院的病程与病例数 */
function pooledCourse(text) {
  const m = text.match(/([\d.]+)、([\d.]+)、([\d.]+)\s*年，病例数\s*(\d+)、(\d+)、(\d+)/);
  if (!m) throw new Error('正文缺三家医院病程的汇总算例');
  const rates = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ns = [Number(m[4]), Number(m[5]), Number(m[6])];
  const total = ns.reduce((a, b) => a + b, 0);
  return {
    rates,
    ns,
    simple: rates.reduce((a, b) => a + b, 0) / rates.length,
    weighted: rates.reduce((a, r, i) => a + r * ns[i], 0) / total,
  };
}

/** 两个月各 200/40 例的有效率与合计率 */
function twoMonths(text) {
  const m = text.match(/1 月\s*(\d+)\s*例、有效\s*(\d+)\s*例（(\d+)%），2 月\s*(\d+)\s*例、有效\s*(\d+)\s*例（(\d+)%）/);
  if (!m) throw new Error('正文缺两个月有效率的算例');
  const n1 = Number(m[1]);
  const e1 = Number(m[2]);
  const n2 = Number(m[4]);
  const e2 = Number(m[5]);
  return {
    n1,
    e1,
    n2,
    e2,
    r1: e1 / n1,
    r2: e2 / n2,
    meanOfRates: (e1 / n1 + e2 / n2) / 2,
    pooled: (e1 + e2) / (n1 + n2),
  };
}

/** 就诊次数的正态法参考区间 */
function visitInterval(text) {
  const m = text.match(/均值\s*([\d.]+)\s*次、标准差\s*([\d.]+)\s*次/);
  if (!m) throw new Error('正文缺就诊次数的均值与标准差');
  const mean = Number(m[1]);
  const sd = Number(m[2]);
  return { mean, sd, lo: mean - 1.96 * sd, hi: mean + 1.96 * sd };
}

/** 对数变换后的均值 → 几何均数 */
function geometric(text) {
  const m = text.match(/bar y=([\d.]+)/);
  if (!m) throw new Error('正文缺对数变换后的均值');
  return { meanLog: Number(m[1]), geo: Math.exp(Number(m[1])) };
}

function compute(text) {
  const hs = herbSpread(text);
  const ml = medianLine(text);
  return {
    spread: hs,
    cv: hs.sd / hs.mean,
    median: ml,
    skewQ: hs.mean - ml.median,
    course: pooledCourse(text),
    months: twoMonths(text),
    visits: visitInterval(text),
    geo: geometric(text),
  };
}

function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  need(Math.round(c.cv * 100) === 38 && text.includes('CV=5.8/15.2'), '变异系数应为 38%');
  need(text.includes(c.course.weighted.toFixed(2)), `加权病程重算为 ${c.course.weighted.toFixed(2)}，正文找不到`);
  need(text.includes(c.course.simple.toFixed(2)), `直接平均重算为 ${c.course.simple.toFixed(2)}，正文找不到`);
  need(text.includes((c.months.pooled * 100).toFixed(1)), `合计率重算为 ${(c.months.pooled * 100).toFixed(1)}%，正文找不到`);
  need(text.includes(c.visits.lo.toFixed(1)), `正态法下界重算为 ${c.visits.lo.toFixed(1)}，正文找不到`);
  need(text.includes(c.visits.hi.toFixed(1)), `正态法上界重算为 ${c.visits.hi.toFixed(1)}，正文找不到`);
  need(Math.abs(c.geo.geo - 14.1) < 0.06 && text.includes('14.1'), `几何均数重算为 ${c.geo.geo.toFixed(2)}，与正文 14.1 不符`);
  need(c.skewQ > 0, '均数应高于中位数（右偏）');
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
    cites: citations(text).length,
    drills: (text.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const c = verify(text);
  const pct = (x) => `${(x * 100).toFixed(1)}%`;

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字 ${s.hanzi.toLocaleString('en-US')} · 节 ${s.sections} · 表 ${s.tables} · 引文 ${s.cites} 处 · 演算设定 ${s.drills} 处`);
  console.log('');
  console.log(`味数：均值 ${c.spread.mean}、标准差 ${c.spread.sd}、CV ${pct(c.cv)}；中位数 ${c.median.median}、IQR ${c.median.q1}–${c.median.q3}（${c.median.iqr} 味）。`);
  console.log(`均值减中位数 = ${c.skewQ.toFixed(1)} 味 > 0，右偏证据。`);
  console.log('');
  console.log(`跨院病程：直接平均 ${c.course.simple.toFixed(2)} 年，按病例数加权 ${c.course.weighted.toFixed(2)} 年。`);
  console.log(`两个月有效率：${pct(c.months.r1)} 与 ${pct(c.months.r2)}，逐月平均 ${pct(c.months.meanOfRates)}，合计 ${pct(c.months.pooled)}。`);
  console.log(`就诊次数 95% 参考区间（正态法）：[${c.visits.lo.toFixed(1)}, ${c.visits.hi.toFixed(1)}]，下界为负。`);
  console.log(`对数变换均值 ${c.geo.meanLog} → 几何均数 ${c.geo.geo.toFixed(2)}，接近中位数 ${c.median.median}。`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：正文一改，CV、加权均数、合计率与区间跟着变。');
  console.log('※ 本章数值为演算设定，用于演示描述统计量之间的关系，不对应任何真实处方集。');
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
  compute,
  verify,
  stats,
  main,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
