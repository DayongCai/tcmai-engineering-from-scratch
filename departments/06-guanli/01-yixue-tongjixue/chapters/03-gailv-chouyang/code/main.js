#!/usr/bin/env node
/**
 * 医学统计学 · 第 3 章 样本的「率」是一团会呼吸的数
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/03-gailv-chouyang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的 14/20、三种区间算法、四行二项尾概率与设计效应示例，全部从正文抓取后现算。
 * 二项尾概率用对数伽马函数直接求和，Wilson 区间按定义式复算 —— 不引用任何结果表。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function logGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j += 1) { y += 1; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/** P(X >= k)，X ~ Binomial(n, p) */
function binomTail(n, k, p) {
  let sum = 0;
  for (let i = k; i <= n; i += 1) {
    const logC = logGamma(n + 1) - logGamma(i + 1) - logGamma(n - i + 1);
    sum += Math.exp(logC + i * Math.log(p) + (n - i) * Math.log(1 - p));
  }
  return sum;
}

function wilson(k, n, z = 1.96) {
  const p = k / n;
  const den = 1 + (z * z) / n;
  const mid = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(mid - half) / den, (mid + half) / den];
}

function normalApprox(k, n, z = 1.96) {
  const p = k / n;
  const half = z * Math.sqrt((p * (1 - p)) / n);
  return [p - half, p + half];
}

function compute(doc) {
  const n = Number((doc.match(/一项\s*(\d+)\s*例的证候疗效观察/) || [])[1]);
  const k = Number((doc.match(/，(\d+)\s*例有效/) || [])[1]);
  const reported = Number((doc.match(/报告写「有效率\s*(\d+)%/) || [])[1]);
  const rows = [];
  const re = /^\|\s*(\d+)%\s*\|\s*([\d.]+)%\s*\|/gm;
  let m;
  while ((m = re.exec(doc)) !== null) rows.push({ p: Number(m[1]) / 100, tail: Number(m[2]) / 100 });
  if (!rows.length) throw new Error('正文里找不到二项尾概率表');
  const tails = rows.map((r) => ({ ...r, computed: binomTail(n, k, r.p) }));
  const w = wilson(k, n);
  const norm = normalApprox(k, n);
  const deff = (mCount, rho) => 1 + (mCount - 1) * rho;
  return { n, k, reported, tails, wilson: w, normal: norm, phat: k / n, deff };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  ok(Math.round(r.phat * 100) === r.reported, `14/20 = ${Math.round(r.phat * 100)}%`);
  ok(Math.abs(r.wilson[0] * 100 - 48.1) < 0.1 && Math.abs(r.wilson[1] * 100 - 85.5) < 0.1, 'Wilson 区间 48.1%～85.5%');
  ok(Math.abs(r.normal[0] * 100 - 49.9) < 0.1 && Math.abs(r.normal[1] * 100 - 90.1) < 0.1, '正态近似 49.9%～90.1%');
  for (const t of r.tails) ok(Math.abs(t.computed * 100 - t.tail * 100) < 0.06, `${t.p * 100}% 时尾概率 ${(t.tail * 100).toFixed(1)}%`);
  ok(Math.abs(r.deff(20, 0.05) - 1.95) < 0.005 && doc.includes('1.95'), 'm=20、ρ=0.05 时设计效应 1.95');
  ok(Math.round(600 / r.deff(20, 0.05)) === 308 && doc.includes('308'), '600 例折合独立样本 308 例');
  ok(Math.abs(r.deff(20, 0.15) - 3.85) < 0.005 && doc.includes('3.85'), 'ρ=0.15 时设计效应 3.85');
  return out;
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  console.log('医学统计学 · 第 3 章 样本的「率」是一团会呼吸的数');
  console.log('');
  console.log(`正文观察 ${r.n} 例，${r.k} 例有效，点估计 ${pct(r.phat)}（正文记 ${r.reported}%）`);
  console.log(`Wilson 95% 区间 ${pct(r.wilson[0])}～${pct(r.wilson[1])}`);
  console.log(`正态近似 95% 区间 ${pct(r.normal[0])}～${pct(r.normal[1])}`);
  console.log('二项尾概率 P(X ≥ 14)：');
  for (const t of r.tails) {
    console.log(`  真实率 ${pct(t.p)}：现算 ${pct(t.computed)}，正文 ${pct(t.tail)}`);
  }
  console.log(`设计效应 m=20、ρ=0.05：${r.deff(20, 0.05).toFixed(2)}；ρ=0.15：${r.deff(20, 0.15).toFixed(2)}`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：20 例的率必须在区间里读；点估计相同的两个研究，精度可以差很远。');
  console.log('※ 数字由本章正文参数现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意，不构成研究结论或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, binomTail, wilson, normalApprox, compute, DOC_PATH };
