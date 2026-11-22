#!/usr/bin/env node
/**
 * 医学统计学 · 第 10 章 报告的价值，在于别人能照着重算一遍
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/10-baogao-kefuxian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文抓出标准化差值 0.6、α=0.05、把握度 0.8 与失访 20%，现算每组样本量，
 * 并把正文里的 43.6、44、55 逐项对账；再复算百分比反算例数（65.0% × 60）与
 * 摘要里的 40/60、25/60 两个率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

const Z_ALPHA_TWO_SIDED = 1.959963984540054;
const Z_POWER_80 = 0.8416212335729143;

/** 两组均数比较：n/组 = 2(z_{1−α/2}+z_{1−β})² / d² */
function sampleSizePerGroup(d, alpha = 0.05, power = 0.8) {
  const zA = alpha === 0.05 ? Z_ALPHA_TWO_SIDED : null;
  const zB = power === 0.8 ? Z_POWER_80 : null;
  if (zA === null || zB === null) throw new Error('本脚本只实现 α=0.05、把握度 0.8 的情形');
  return (2 * (zA + zB) ** 2) / (d * d);
}

function inflateForDropout(n, dropout) {
  return n / (1 - dropout);
}

function compute(doc) {
  const d = Number((doc.match(/检出\s*([\d.]+)\s*个标准差的组间差异/) || [])[1]);
  const dropout = Number((doc.match(/预计失访\s*(\d+)%/) || [])[1]) / 100;
  const alpha = Number((doc.match(/双侧 α=([\d.]+)/) || [])[1] || 0.05);
  const raw = sampleSizePerGroup(d, alpha, 0.8);
  const rounded = Math.ceil(raw);
  const inflated = inflateForDropout(rounded, dropout);
  const pctExample = {
    rate: Number((doc.match(/报告\s*(\d+\.\d+)%\s*且\s*n=(\d+)/) || [])[1] || 65.0) / 100,
    n: Number((doc.match(/报告\s*\d+\.\d+%\s*且\s*n=(\d+)/) || [])[1] || 60),
  };
  const crossMatch = doc.match(/(\d+)\/60\s*与\s*(\d+)\/60/);
  const cross = [
    { label: '试验组', a: crossMatch ? Number(crossMatch[1]) : 40, n: 60 },
    { label: '对照组', a: crossMatch ? Number(crossMatch[2]) : 25, n: 60 },
  ];
  return { d, dropout, alpha, raw, rounded, inflated, pctExample, cross,
    expectedCount: pctExample.rate * pctExample.n };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  ok(Math.abs(r.d - 0.6) < 1e-9, '标准化差值 d=0.6');
  ok(Math.abs(r.raw - 43.6) < 0.05 && doc.includes('43.6'), `每组 ${r.raw.toFixed(1)} 例`);
  ok(r.rounded === 44 && doc.includes('44 例/组'), '向上取整 44 例/组');
  ok(Math.abs(r.inflated - 55) < 1e-9 && doc.includes('44/0.8=55'), '含 20% 失访后 55 例/组');
  ok(Math.abs(r.expectedCount - 39) < 1e-9 && doc.includes('反算应得 39 例'), '65.0% × 60 反算 39 例');
  ok(Math.abs(r.cross[0].a / r.cross[0].n - 40 / 60) < 1e-12 && doc.includes('40/60'), '摘要 66.7% 对应 40/60');
  ok(Math.abs(r.cross[1].a / r.cross[1].n - 25 / 60) < 1e-12 && doc.includes('25/60'), '对照组 41.7% 对应 25/60');
  ok(Math.abs(1 / Math.sqrt(20) - 0.2236) < 0.0001 && doc.includes('0.22 倍'), 'n=20 时标准误是标准差的 0.22 倍');
  return out;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  console.log('医学统计学 · 第 10 章 报告的价值，在于别人能照着重算一遍');
  console.log('');
  console.log(`输入：d=${r.d}，α=${r.alpha}（双侧），把握度 0.8，预计失访 ${(r.dropout * 100).toFixed(0)}%`);
  console.log(`每组原始例数 ${r.raw.toFixed(1)} → 取整 ${r.rounded} → 含失访 ${r.inflated.toFixed(0)} 例/组`);
  console.log(`百分比反算：${(r.pctExample.rate * 100).toFixed(1)}% × n=${r.pctExample.n} → ${r.expectedCount.toFixed(0)} 例`);
  console.log(`摘要跨处一致：40/60=${((40 / 60) * 100).toFixed(1)}%，25/60=${((25 / 60) * 100).toFixed(1)}%`);
  console.log(`n=20 时标准误/标准差 = ${(1 / Math.sqrt(20)).toFixed(3)}`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：样本量四个输入缺一不可；表内加减、百分比反算、跨处一致是交稿前最便宜的自查。');
  console.log('※ 数字由本章正文参数现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意数据，不构成研究结论或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, sampleSizePerGroup, inflateForDropout, compute, DOC_PATH };
