#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 9 章 聚类：算法一定会给你几个簇，问题是谁来认领它们
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/09-m9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文的轮廓系数表现算：峰值的跨度、最高与次高之差、峰值相对邻域的抬升倍数。
 * 另算未标准化时两个维度对欧氏距离的贡献占比。数字都是正文的演算设定。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const TITLE = '聚类：算法一定会给你几个簇，问题是谁来认领它们';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function tables(text) {
  const lines = String(text).split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^\s*\|/.test(lines[i])) { i += 1; continue; }
    const block = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { block.push(lines[i]); i += 1; }
    if (block.length < 3 || !/^\s*\|[\s:|-]+\|\s*$/.test(block[1])) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    out.push({ header: cells(block[0]), rows: block.slice(2).map(cells) });
  }
  return out;
}

const num = (s) => {
  const m = String(s).replace(/\*/g, '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/** 一条曲线（k → 值）的峰值、次高与邻域抬升 */
function peakProfile(points) {
  if (!Array.isArray(points) || points.length < 3) throw new Error('至少三个点才谈峰值');
  const sorted = [...points].sort((a, b) => b.v - a.v);
  const top = sorted[0];
  const second = sorted[1];
  const span = Math.max(...points.map((p) => p.v)) - Math.min(...points.map((p) => p.v));
  const neighbours = points.filter((p) => Math.abs(p.k - top.k) === 1);
  const nbMax = Math.max(...neighbours.map((p) => p.v));
  return {
    bestK: top.k,
    best: top.v,
    second: second.v,
    gap: top.v - second.v,
    span,
    neighbourMax: nbMax,
    lift: top.v / nbMax,
  };
}

/** 未标准化时，两个维度对平方距离的贡献占比 */
function share(a, b) {
  if (!(a > 0) || !(b > 0)) throw new Error('差值须为正');
  const sa = a * a;
  const sb = b * b;
  return { a: sa / (sa + sb), b: sb / (sa + sb) };
}

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);

  const silT = tbl.find((t) => t.header.join('').includes('纯噪声'));
  const rows = silT ? silT.rows.map((r) => ({ k: num(r[0]), noise: num(r[1]), real: num(r[2]) })) : [];
  const noise = peakProfile(rows.map((r) => ({ k: r.k, v: r.noise })));
  const real = peakProfile(rows.map((r) => ({ k: r.k, v: r.real })));

  const amp = Number((body.match(/幅度上差\s*([\d.]+)、在脉率上差\s*(\d+)/) || [])[1]);
  const rate = Number((body.match(/幅度上差\s*([\d.]+)、在脉率上差\s*(\d+)/) || [])[2]);

  const presetT = tbl.find((t) => t.header.join('').includes('出现在哪'));
  const kmSec = body.split('## 三、')[1] || '';
  const preconditions = (kmSec.match(/^\s*\d+\.\s+/gm) || []).length;

  return {
    hanzi: (body.match(HANZI) || []).length,
    tables: tbl.length,
    rows,
    noise,
    real,
    amp,
    rate,
    share: share(amp, rate),
    presets: presetT ? presetT.rows.length : 0,
    preconditions,
  };
}

function main() {
  const text = read();
  const a = analyze(text);

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 表格 ${a.tables} 张 · 预设 ${a.presets} 条 · k-means 前提 ${a.preconditions} 条`);
  console.log('');
  console.log('轮廓系数表（正文解析，再看峰值形态）：');
  for (const r of a.rows) {
    console.log(`  k ＝ ${r.k}  噪声 ${r.noise.toFixed(3)}  真实簇 ${r.real.toFixed(3)}`);
  }
  console.log('');
  console.log('纯噪声一列：');
  console.log(`  极差 ${a.noise.span.toFixed(3)}（最高与最低只差这么多）`);
  console.log(`  最高 k ＝ ${a.noise.bestK}（${a.noise.best.toFixed(3)}），与次高之差 ${a.noise.gap.toFixed(3)}`);
  console.log('  → 「最优点」在这批数据上完全由随机性决定。');
  console.log('');
  console.log('真实簇一列：');
  console.log(`  最高 k ＝ ${a.real.bestK}（${a.real.best.toFixed(3)}），邻域最高 ${a.real.neighbourMax.toFixed(3)}，抬升 ${a.real.lift.toFixed(2)} 倍`);
  console.log('  → 看抬升倍数，不看绝对值；峰值还得超出零模型的高分位。');
  console.log('');
  console.log(`未标准化时的距离：幅度差 ${a.amp}、脉率差 ${a.rate}`);
  console.log(`  平方和 ${(a.amp ** 2).toFixed(2)} + ${(a.rate ** 2).toFixed(0)} → 幅度只占 ${(a.share.a * 100).toFixed(2)}%，脉率占 ${(a.share.b * 100).toFixed(2)}%`);
  console.log('');
  console.log('※ 轮廓系数表是正文的合成数据演算结果，不对应任何真实人群。');
  console.log('※ 聚类结果不具有诊断意义；缺外部效度证据时只能作为探索性假设。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, tables, peakProfile, share };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
