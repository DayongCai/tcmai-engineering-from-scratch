#!/usr/bin/env node
/**
 * 医学统计学 · 第 4 章 p 值量的是「差得够不够稳」，不是「差得够不够大」
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/04-jiashe-pzhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的两个样本量情形（20 与 60）、0.8 分差值、标准差 1.5 都从正文抓取。
 * t 值、双侧 p、置信区间与最小可检出差异在这里现算，t 分布用不完全贝塔函数实现。
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

function betacf(a, b, x) {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function tCDF(t, df) {
  const x = df / (df + t * t);
  const p = 0.5 * ibeta(df / 2, 0.5, x);
  return t > 0 ? 1 - p : p;
}

function tQuantile(p, df) {
  let lo = -20;
  let hi = 20;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function twoSidedP(t, df) {
  return 2 * (1 - tCDF(Math.abs(t), df));
}

/** 两独立样本（等样本量）的均值差分析 */
function twoGroup(diff, sd, n) {
  const se = sd * Math.sqrt(2 / n);
  const df = 2 * n - 2;
  const t = diff / se;
  const p = twoSidedP(t, df);
  const crit = tQuantile(0.975, df);
  return { n, df, se, t, p, ci: [diff - crit * se, diff + crit * se] };
}

/** 最小可检出差异：MDD = (z_{1−α/2} + z_{1−β}) × σ × √(2/n)，此处取把握度 0.8 */
function mdd(sd, n) {
  const zAlpha = 1.96;
  const zBeta = 0.8416212335729143;
  return (zAlpha + zBeta) * sd * Math.sqrt(2 / n);
}

function compute(doc) {
  const m = doc.match(/症状积分均值\s*([\d.]+)\s*与\s*([\d.]+)/);
  const s = doc.match(/标准差各约\s*([\d.]+)/);
  const n20 = Number((doc.match(/两组各\s*(\d+)\s*例/) || [])[1]);
  const n60 = Number((doc.match(/每组\s*(\d+)\s*例时/) || [])[1]);
  if (!m || !s || !n20 || !n60) throw new Error('正文里的均值、标准差或样本量抓取失败');
  const meanA = Number(m[1]);
  const meanB = Number(m[2]);
  const sd = Number(s[1]);
  const diff = meanA - meanB;
  return {
    meanA, meanB, sd, diff, d: diff / sd,
    small: twoGroup(diff, sd, n20),
    large: twoGroup(diff, sd, n60),
    mdd: { n20: mdd(sd, n20), n60: mdd(sd, n60) },
  };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  ok(Math.abs(r.diff - 0.8) < 1e-9, '均值差 0.8 分');
  ok(Math.abs(r.d - 0.53) < 0.005, `标准化差值 d=${r.d.toFixed(2)}`);
  ok(Math.abs(r.small.t - 1.69) < 0.01, `n=20 时 t=${r.small.t.toFixed(2)}`);
  ok(Math.abs(r.small.p - 0.100) < 0.002, `n=20 时 p=${r.small.p.toFixed(3)}`);
  ok(Math.abs(r.large.t - 2.92) < 0.01, `n=60 时 t=${r.large.t.toFixed(2)}`);
  ok(Math.abs(r.large.p - 0.004) < 0.0005, `n=60 时 p=${r.large.p.toFixed(3)}`);
  ok(Math.abs(r.small.ci[0] + 0.16) < 0.01 && Math.abs(r.small.ci[1] - 1.76) < 0.01, 'n=20 时区间约 −0.16～1.76');
  ok(Math.abs(r.large.ci[0] - 0.26) < 0.01 && Math.abs(r.large.ci[1] - 1.34) < 0.01, 'n=60 时区间约 0.26～1.34');
  ok(Math.abs(r.mdd.n20 - 1.33) < 0.01 && doc.includes('1.33'), `n=20 时 MDD=${r.mdd.n20.toFixed(2)}`);
  ok(Math.abs(r.mdd.n60 - 0.77) < 0.01 && doc.includes('0.77'), `n=60 时 MDD=${r.mdd.n60.toFixed(2)}`);
  return out;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  console.log('医学统计学 · 第 4 章 p 值量的是「差得够不够稳」，不是「差得够不够大」');
  console.log('');
  console.log(`正文两组均值 ${r.meanA} 与 ${r.meanB}，差值 ${r.diff.toFixed(2)}，标准差 ${r.sd}，标准化差值 d=${r.d.toFixed(2)}`);
  for (const [label, x] of [['每组 20 例', r.small], ['每组 60 例', r.large]]) {
    console.log(`${label}：SE=${x.se.toFixed(3)}，t=${x.t.toFixed(2)}，df=${x.df}，p=${x.p.toFixed(3)}，95% CI ${x.ci[0].toFixed(2)}～${x.ci[1].toFixed(2)}`);
  }
  console.log(`最小可检出差异：n=20 时 ${r.mdd.n20.toFixed(2)} 分，n=60 时 ${r.mdd.n60.toFixed(2)} 分（σ=${r.sd}，把握度 0.8）`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：同一效应在两个样本量下得到相反结论，p 值随 n 变而效应不变；报告须同时给效应量与区间。');
  console.log('※ 数字由本章正文参数现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意数据，不构成研究结论或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, tCDF, tQuantile, twoSidedP, twoGroup, mdd, compute, DOC_PATH };
