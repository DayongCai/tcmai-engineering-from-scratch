#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 3 章 特征提取：可重复的不是特征，是提取它的那套流程
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/03-m3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取样本数与特征数，现算两者之比；再把「每特征十个样本」这条经验换算成
 * 这批样本量能支持的特征数。域、信度层次、流程步数、情境表行数都从正文数出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '特征提取：可重复的不是特征，是提取它的那套流程';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  const out = [];
  let cur = { title: '（题解）', lines: [] };
  for (const line of String(text).split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { out.push(cur); cur = { title: h[1], lines: [] }; continue; }
    cur.lines.push(line);
  }
  out.push(cur);
  return out.map((s) => ({
    title: s.title,
    body: s.lines.join('\n'),
    hanzi: (s.lines.join('\n').match(HANZI) || []).length,
  })).filter((s) => s.title !== '（题解）');
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

/** 特征数与样本数之比，返回 {features, n, ratio, perSample} */
function burden(features, n) {
  if (!(features > 0 && n > 0)) throw new Error('特征数与样本数必须为正');
  return { features, n, ratio: features / n, perSample: features / n };
}

/** 按「每个特征至少 k 个样本」的经验，这批样本量能支持的特征数 */
function budget(n, k) {
  if (!(n > 0 && k > 0)) throw new Error('参数必须为正');
  return Math.floor(n / k);
}

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const fM = body.match(/(\d+)\s*个\s*特征/) || body.match(/特征\s*有\s*(\d+)\s*个/);
  const nM = body.match(/(\d+)\s*例/);
  const features = fM ? Number(fM[1]) : NaN;
  const n = nM ? Number(nM[1]) : NaN;
  const secs = sections(body);
  const tbl = tables(body);
  const domainT = tbl.find((t) => t.header.includes('主要反映'));
  const relSec = secs.find((s) => /重测/.test(s.title));
  const stepSec = secs.find((s) => /顺序纪律/.test(s.title));
  const ctxT = tbl.find((t) => t.header.includes('情境'));

  return {
    hanzi: (body.match(HANZI) || []).length,
    sections: secs,
    tables: tbl.length,
    features,
    n,
    burden: burden(features, n),
    domains: domainT ? domainT.rows.length : 0,
    reliabilityLayers: relSec ? (relSec.body.match(/^\s*\d+\.\s+/gm) || []).length : 0,
    steps: stepSec ? (stepSec.body.match(/^\s*\d+\.\s+/gm) || []).length : 0,
    contexts: ctxT ? ctxT.rows.length : 0,
  };
}

function main() {
  const text = read();
  const a = analyze(text);
  const b = a.burden;
  const tens = budget(a.n, 10);
  const doable = budget(a.n, 10);

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张`);
  console.log('');
  console.log(`正文的情境：${a.n} 例 · ${a.features} 个特征`);
  console.log(`  特征 ∶ 样本 ＝ ${b.features} ∶ ${b.n} ＝ ${b.ratio.toFixed(0)}∶1（每个样本摊到 ${b.perSample.toFixed(1)} 个特征）`);
  console.log(`  按「每个特征至少十个样本」，这 ${a.n} 例最多支持 ${doable} 个特征；`);
  console.log(`  若入模取 ${tens + 2} 个，比例是 ${(a.n / (tens + 2)).toFixed(1)}∶1，已经低于十比一。`);
  console.log('');
  console.log(`特征分域 ${a.domains} 类 · 重测信度 ${a.reliabilityLayers} 层 · 流程纪律 ${a.steps} 步 · 情境对照 ${a.contexts} 行`);
  console.log('');
  console.log('※ 特征域、信度层次、流程步数都由正文章节结构与表格现算。');
  console.log('※ 本章不给任何阈值与信度系数；「十来个」是量级建议，不是标准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, sections, tables, burden, budget };
