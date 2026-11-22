#!/usr/bin/env node
/**
 * 医学统计学 · 第 2 章 只报一个均数不叫描述，得报一对
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/02-miaoshu-fenbu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文给出的 30 例血糖频数表、均数、标准差、中位数与四分位数都从正文读出。
 * 脚本按组中值复算分组均数，与正文报告的均数对账；再核对均数减标准差的下限、
 * 标准误与标准差的比值，全部现算，不手打结果。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

/** 解析正文的频数表：| 组段 | 频数 | 累积频数 | */
function parseFrequencyTable(doc) {
  const rows = [];
  const re = /^\|\s*([\d.]+)～\s*([\d.]*)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm;
  let m;
  while ((m = re.exec(doc)) !== null) {
    rows.push({ low: Number(m[1]), high: m[2] ? Number(m[2]) : null, freq: Number(m[3]), cum: Number(m[4]) });
  }
  if (!rows.length) throw new Error('正文里找不到频数表');
  return rows;
}

function num(doc, re, label) {
  const m = doc.match(re);
  if (!m) throw new Error(`正文里找不到${label}`);
  return Number(m[1]);
}

function compute(doc) {
  const n = num(doc, /(\d+)\s*例空腹血糖/, '样本量');
  const mean = num(doc, /均数\s*([\d.]+)/, '均数');
  const sd = num(doc, /标准差\s*([\d.]+)/, '标准差');
  const median = num(doc, /中位数\s*([\d.]+)/, '中位数');
  const p25 = num(doc, /P25=([\d.]+)/, 'P25');
  const p75 = num(doc, /P75=([\d.]+)/, 'P75');
  const width = num(doc, /组距\s*([\d.]+)/, '组距');
  const rows = parseFrequencyTable(doc);
  const total = rows.reduce((a, r) => a + r.freq, 0);
  if (total !== n) throw new Error(`频数合计 ${total} 与正文的 ${n} 例不一致`);
  const groupedMean = rows.reduce((a, r) => a + r.freq * (r.low + width / 2), 0) / total;
  const lower = mean - sd;
  const seRatio = 1 / Math.sqrt(n);
  return { n, mean, sd, median, p25, p75, width, rows, total, groupedMean, lower, seRatio,
    iqr: p75 - p25, cv: sd / mean, skewSign: mean - median };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  ok(Math.abs(r.groupedMean - r.mean) < 0.1, `分组均数 ${r.groupedMean.toFixed(2)} 与报告均数 ${r.mean} 相差不足 0.1`);
  ok(Math.abs(r.lower - 4.42) < 1e-9 && doc.includes('4.42'), '均数减标准差的下限 4.42');
  ok(Math.abs(r.seRatio - 0.18) < 0.005 && doc.includes('0.18 倍'), '标准误约为标准差的 0.18 倍');
  ok(r.skewSign > 0, '均数大于中位数，支持右偏');
  const cumOk = r.rows.every((row, i) => row.cum === r.rows.slice(0, i + 1).reduce((a, x) => a + x.freq, 0));
  ok(cumOk, '累积频数逐行与频数相加一致');
  return out;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  console.log('医学统计学 · 第 2 章 只报一个均数不叫描述，得报一对');
  console.log('');
  console.log(`样本 ${r.n} 例，频数表 ${r.rows.length} 个组段，组距 ${r.width}`);
  console.log(`正文均值 ${r.mean}，标准差 ${r.sd}，中位数 ${r.median}，P25=${r.p25}，P75=${r.p75}`);
  console.log(`分组均数（组中值加权）${r.groupedMean.toFixed(2)}，与报告均数差 ${Math.abs(r.groupedMean - r.mean).toFixed(2)}`);
  console.log(`均数 − 标准差 = ${r.lower.toFixed(2)}；标准误 / 标准差 = ${r.seRatio.toFixed(3)}`);
  console.log(`四分位数间距 ${r.iqr.toFixed(2)}，变异系数 ${r.cv.toFixed(3)}，均数 − 中位数 = ${r.skewSign.toFixed(2)}`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：形状、位置、离散是三项独立信息；偏态资料报中位数与四分位数间距。');
  console.log('※ 数字由本章正文频数表现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意数据，不构成诊断标准或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseFrequencyTable, compute, assertDocNumbers, DOC_PATH };
