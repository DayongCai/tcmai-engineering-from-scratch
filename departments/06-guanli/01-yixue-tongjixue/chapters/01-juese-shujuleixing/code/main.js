#!/usr/bin/env node
/**
 * 医学统计学 · 第 1 章 数据类型定错了，后面每个数字都跟着错
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/01-juese-shujuleixing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的 20 例四级疗效与两套赋值都写在正文里。脚本从正文抓出频数与权重组，
 * 现算加权和与均值，再与正文报告的数字对账 —— 正文改了而脚本没跟上，会直接抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

/** 从 PROBLEM 抓四级疗效频数 */
function parseCounts(doc) {
  const m = doc.match(/治愈\s*(\d+)\s*例、显效\s*(\d+)\s*例、有效\s*(\d+)\s*例、无效\s*(\d+)\s*例/);
  if (!m) throw new Error('正文里找不到四级疗效频数');
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
}

/**
 * 从正文抓两套赋值。
 * 等距赋值 3/2/1/0 与频数同序；临床权重标签写的是 0/1/3/5（无效→治愈），
 * 而括号里的算式是 4×5 + 6×3 + 7×1 + 3×0，即治愈→无效为 5/3/1/0。
 * 这里以算式为准取权重，同时保留标签原文，避免把两种排列混为一谈。
 */
function parseWeights(doc) {
  const grab = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    const weights = [];
    const term = /(\d+)×(\d+)/g;
    let t;
    while ((t = term.exec(m[1])) !== null) weights.push(Number(t[2]));
    return weights;
  };
  const equal = grab(/等距赋值\s*[\d/]+：平均\s*=\s*\(([^)]+)\)/, '等距赋值算式');
  const clinical = grab(/临床权重\s*[\d/]+：平均\s*=\s*\(([^)]+)\)/, '临床权重算式');
  const label = doc.match(/临床权重\s*([\d/]+)：/);
  return { equal, clinical, label: label ? label[1].split('/').map(Number) : [] };
}

function weightedSum(counts, weights) {
  if (counts.length !== weights.length) throw new Error('频数与权重组长度不一致');
  return counts.reduce((sum, c, i) => sum + c * weights[i], 0);
}

function weightedMean(counts, weights) {
  return weightedSum(counts, weights) / counts.reduce((a, b) => a + b, 0);
}

/** 正文表格里的四种尺度行 */
function scaleRows(doc) {
  return (doc.match(/^\|\s*(定类|定序|定距|定比)\s*\|/gm) || []).map((s) => s.replace(/\|/g, '').trim());
}

function compute(doc) {
  const statedN = Number((doc.match(/一批\s*(\d+)\s*例/) || [])[1]);
  const counts = parseCounts(doc);
  const weights = parseWeights(doc);
  const n = counts.reduce((a, b) => a + b, 0);
  if (n !== statedN) throw new Error(`频数合计 ${n} 与正文的 ${statedN} 例不一致`);
  const equal = { sum: weightedSum(counts, weights.equal), mean: weightedMean(counts, weights.equal) };
  const clinical = { sum: weightedSum(counts, weights.clinical), mean: weightedMean(counts, weights.clinical) };
  const rise = ((clinical.mean - equal.mean) / equal.mean) * 100;
  return { n, counts, weights, equal, clinical, rise, scales: scaleRows(doc) };
}

function assertDocNumbers(doc, r) {
  const report = [];
  const expect = (ok, label) => { if (!ok) throw new Error(`正文对账失败：${label}`); report.push(label); };
  expect(doc.includes('31/20') && Math.abs(r.equal.mean - 1.55) < 1e-9, '等距赋值 31/20 = 1.55');
  expect(doc.includes('45/20') && Math.abs(r.clinical.mean - 2.25) < 1e-9, '临床权重 45/20 = 2.25');
  expect(Math.round(r.rise) === 45 && doc.includes('45%'), '均值上浮约 45%');
  expect(r.scales.length === 4, '四种尺度各一行');
  expect((doc.match(/^\*\*第[一二三四]问/gm) || []).length === 4, '变量清单四问');
  expect(r.weights.label.join('/') === '0/1/3/5', '临床权重标签按无效→治愈排列');
  return report;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  console.log('医学统计学 · 第 1 章 数据类型定错了，后面每个数字都跟着错');
  console.log('');
  console.log(`正文样本 ${r.n} 例，四级频数 ${r.counts.join(' / ')}，合计 ${r.counts.reduce((a, b) => a + b, 0)}`);
  console.log(`等距赋值 ${r.weights.equal.join('/')}：加权和 ${r.equal.sum}，均值 ${r.equal.mean.toFixed(2)}`);
  console.log(`临床权重（标签 ${r.weights.label.join('/')}，按治愈→无效取 ${r.weights.clinical.join('/')}）：加权和 ${r.clinical.sum}，均值 ${r.clinical.mean.toFixed(2)}`);
  console.log(`同一批病人，均值上浮 ${r.rise.toFixed(1)}%（正文记 45%）`);
  console.log(`尺度表可识别 ${r.scales.length} 行：${r.scales.join('、')}`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：赋分改变了「距离」，只用次序的统计量不受影响；尺度判定先于统计量选择。');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意，不构成研究方案或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseCounts, parseWeights, weightedSum, weightedMean, scaleRows, compute, DOC_PATH };
