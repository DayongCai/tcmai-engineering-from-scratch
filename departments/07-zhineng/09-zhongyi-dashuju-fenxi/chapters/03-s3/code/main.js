#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 3 章 p 值不是有效性的判决书
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/03-s3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：率差与标准误、Wald／Wilson 区间、设计效应与有效样本量、样本量公式、亚组族错误率，
 * 全部由正文给的原始数现算；结果要回落到正文的写法，对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 3;
const SLUG = '03-s3';
const TITLE = 'p 值不是有效性的判决书';
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

/** 两组各 n 例的 2×2 率差 */
function twoRates(text) {
  const m = text.match(/有效率\s*[\d.]+%（(\d+)\/(\d+)）对\s*[\d.]+%（(\d+)\/(\d+)）/);
  if (!m) throw new Error('正文缺两组有效率的原始例数');
  const [, a, n1, c, n2] = m.map(Number);
  const p1 = a / n1;
  const p2 = c / n2;
  const diff = p1 - p2;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  return { a, n1, c, n2, p1, p2, diff, se, z: diff / se };
}

/** 小样本率的 Wald 与 Wilson 区间 */
function rateIntervals(text) {
  const m = text.match(/n=(\d+)\$?、\$?p=([\d.]+)/);
  if (!m) throw new Error('正文缺 n 与 p 的算例');
  const n = Number(m[1]);
  const p = Number(m[2]);
  const z = 1.96;
  const seWald = Math.sqrt((p * (1 - p)) / n);
  const center = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return {
    n,
    p,
    wald: [p - z * seWald, p + z * seWald],
    wilson: [center - half, center + half],
  };
}

/** 整群抽样的设计效应 */
function cluster(text) {
  const m = text.match(/抽\s*(\d+)\s*个科室、每科室\s*(\d+)\s*人，共\s*(\d+)\s*例/);
  const r = text.match(/rho=([\d.]+)/);
  if (!m || !r) throw new Error('正文缺整群抽样算例');
  const mSize = Number(m[2]);
  const n = Number(m[3]);
  const rho = Number(r[1]);
  const deff = 1 + (mSize - 1) * rho;
  return { clusters: Number(m[1]), m: mSize, n, rho, deff, neff: n / deff };
}

/** 两样本均数比较的样本量 */
function sampleSize(text) {
  const z = text.match(/z_\{0\.975\}=([\d.]+)\$?，\$?z_\{0\.80\}=([\d.]+)/);
  const d = text.match(/\\delta=([\d.]+)\\sigma/);
  if (!z || !d) throw new Error('正文缺样本量算例的 z 值与效应量');
  const za = Number(z[1]);
  const zb = Number(z[2]);
  const delta = Number(d[1]);
  const n = (2 * (za + zb) ** 2) / delta ** 2;
  return { za, zb, delta, n, perGroup: Math.ceil(n) };
}

/** 十二个亚组里至少一个假阳性的概率 */
function subgroupError(text, k = 12, alpha = 0.05) {
  const m = text.match(/(\d+)\s*个亚组里至少一个显著的概率约\s*(\d+)%/);
  if (!m) throw new Error('正文缺亚组族错误率的算例');
  const groups = Number(m[1]);
  const fwer = 1 - (1 - alpha) ** groups;
  return { groups, alpha, fwer, stated: Number(m[2]) };
}

/** 非劣效界值比较 */
function nonInferiority(text) {
  const ci = text.match(/两组症状积分差\s*([\d.]+)\s*分.*?95% CI 为\s*\$\[(-?[\d.]+),\\,([\d.]+)\]/);
  if (!ci) throw new Error('正文缺非劣效的差值区间');
  const deltas = [...text.matchAll(/若\s*\$?\\Delta=(\d+)\$?\s*分/g)].map((m) => Number(m[1]));
  const lo = Number(ci[2]);
  const hi = Number(ci[3]);
  return {
    diff: Number(ci[1]),
    lo,
    hi,
    deltas: deltas.map((d) => ({ delta: d, holds: hi < d })),
  };
}

function compute(text) {
  return {
    rates: twoRates(text),
    intervals: rateIntervals(text),
    cluster: cluster(text),
    sample: sampleSize(text),
    subgroup: subgroupError(text),
    nonInf: nonInferiority(text),
  };
}

function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const pp = (x) => (x * 100).toFixed(1);
  need(c.rates.z.toFixed(2) === '1.66', `z 重算为 ${c.rates.z.toFixed(2)}，正文写 1.66`);
  need(text.includes(c.rates.z.toFixed(2)), 'z 值未回落到正文');
  need(text.includes(pp(c.rates.se)), `率差标准误 ${pp(c.rates.se)} 个百分点，正文找不到`);
  need(text.includes(c.intervals.wald[0].toFixed(3)) && text.includes(c.intervals.wald[1].toFixed(3)), 'Wald 区间未回落到正文');
  need(text.includes(c.intervals.wilson[0].toFixed(3)) && text.includes(c.intervals.wilson[1].toFixed(3)), 'Wilson 区间未回落到正文');
  need(c.cluster.deff.toFixed(2) === '2.45' && text.includes('2.45'), 'DEFF 应为 2.45');
  need(Math.round(c.cluster.neff) === 245 && text.includes('245'), '有效样本量应为 245');
  need(c.sample.n.toFixed(1) === '62.7' && text.includes('62.7'), '样本量重算应为 62.7');
  need(c.sample.perGroup === 63 && text.includes('63 例'), '向上取整应为 63 例');
  need(Math.round(c.subgroup.fwer * 100) === c.subgroup.stated, '亚组族错误率与正文不符');
  need(c.nonInf.deltas.length === 2, '非劣效应给出两个界值的对照');
  need(c.nonInf.deltas[0].holds === false && c.nonInf.deltas[1].holds === true, '界值 3 不成立、界值 4 成立');
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
  const pp = (x) => `${(x * 100).toFixed(1)} 个百分点`;

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字 ${s.hanzi.toLocaleString('en-US')} · 节 ${s.sections} · 表 ${s.tables} · 引文 ${s.cites} 处 · 演算设定 ${s.drills} 处`);
  console.log('');
  console.log(`两组：${c.rates.a}/${c.rates.n1} 对 ${c.rates.c}/${c.rates.n2}，率差 ${pp(c.rates.diff)}，SE ${pp(c.rates.se)}，z=${c.rates.z.toFixed(2)}。`);
  console.log(`率的区间（n=${c.intervals.n}，p=${c.intervals.p}）：Wald [${c.intervals.wald[0].toFixed(3)}, ${c.intervals.wald[1].toFixed(3)}]；Wilson [${c.intervals.wilson[0].toFixed(3)}, ${c.intervals.wilson[1].toFixed(3)}]。`);
  console.log(`整群：${c.cluster.clusters} 科室 × ${c.cluster.m} 人 = ${c.cluster.n} 例，ρ=${c.cluster.rho}，DEFF=${c.cluster.deff.toFixed(2)}，有效样本量 ${Math.round(c.cluster.neff)}。`);
  console.log(`样本量：δ=${c.sample.delta}σ，每组 ${c.sample.n.toFixed(1)} → 取 ${c.sample.perGroup} 例。`);
  console.log(`${c.subgroup.groups} 个亚组：族错误率 ${(c.subgroup.fwer * 100).toFixed(1)}%，正文写约 ${c.subgroup.stated}%。`);
  console.log(`非劣效：差值 ${c.nonInf.diff}，CI [${c.nonInf.lo}, ${c.nonInf.hi}]；` +
    c.nonInf.deltas.map((d) => `Δ=${d.delta} ${d.holds ? '成立' : '不成立'}`).join('，') + '。');
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：例数、ρ、δ 一改，区间、DEFF 与样本量跟着变。');
  console.log('※ 本章数值为演算设定，用于演示推断量的相互关系，不对应任何真实试验。');
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
