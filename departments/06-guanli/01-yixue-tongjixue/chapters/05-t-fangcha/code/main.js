#!/usr/bin/env node
/**
 * 医学统计学 · 第 5 章 比较的不是两堆数，是差值除以它自己的抖动
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/05-t-fangcha/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的三组均值、组内标准差与每组例数从正文抓取，方差分析由汇总统计量现算：
 * SSB = n·Σ(x̄ᵢ−x̄)²，SSW = Σ(n−1)·sᵢ²，F = (SSB/2)/(SSW/21)。
 * 同时复算三次两两比较的族错误率 1−0.95³。
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

function fCDF(f, d1, d2) {
  return ibeta(d1 / 2, d2 / 2, (d1 * f) / (d1 * f + d2));
}

function tCDF(t, df) {
  const x = df / (df + t * t);
  const p = 0.5 * ibeta(df / 2, 0.5, x);
  return t > 0 ? 1 - p : p;
}

function anova(means, sds, n) {
  const k = means.length;
  const grand = means.reduce((a, b) => a + b, 0) / k;
  const ssb = n * means.reduce((a, x) => a + (x - grand) ** 2, 0);
  const ssw = (n - 1) * sds.reduce((a, s) => a + s * s, 0);
  const dfb = k - 1;
  const dfw = k * (n - 1);
  const F = (ssb / dfb) / (ssw / dfw);
  const sp = Math.sqrt(sds.reduce((a, s) => a + s * s, 0) / k);
  return { grand, ssb, ssw, sst: ssb + ssw, dfb, dfw, msb: ssb / dfb, msw: ssw / dfw, F, p: 1 - fCDF(F, dfb, dfw), sp };
}

function pairwise(means, sds, n) {
  const a = anova(means, sds, n);
  const out = [];
  for (let i = 0; i < means.length; i += 1) {
    for (let j = i + 1; j < means.length; j += 1) {
      const diff = means[i] - means[j];
      const se = a.sp * Math.sqrt(2 / n);
      const t = diff / se;
      out.push({ pair: `${i + 1}-${j + 1}`, diff, t, p: 2 * (1 - tCDF(Math.abs(t), a.dfw)) });
    }
  }
  return out;
}

function compute(doc) {
  const mm = doc.match(/症状积分均值\s*([\d.]+)、([\d.]+)、([\d.]+)/);
  const ss = doc.match(/组内标准差\s*([\d.]+)、([\d.]+)、([\d.]+)/);
  const n = Number((doc.match(/三组各\s*(\d+)\s*例/) || [])[1]);
  if (!mm || !ss || !n) throw new Error('正文里的三组均值、标准差或例数抓取失败');
  const means = [Number(mm[1]), Number(mm[2]), Number(mm[3])];
  const sds = [Number(ss[1]), Number(ss[2]), Number(ss[3])];
  const a = anova(means, sds, n);
  return { means, sds, n, ...a, pairs: pairwise(means, sds, n), familyError: 1 - Math.pow(0.95, 3) };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  ok(Math.abs(r.ssb - 7.92) < 0.02, `组间平方和 ${r.ssb.toFixed(2)}`);
  ok(Math.abs(r.ssw - 11.19) < 0.05, `组内平方和 ${r.ssw.toFixed(2)}`);
  ok(Math.abs(r.F - 7.43) < 0.03, `F=${r.F.toFixed(2)}`);
  ok(Math.abs(r.p - 0.0036) < 0.0002, `p=${r.p.toFixed(4)}`);
  ok(Math.abs(r.sp - 0.73) < 0.005, `合并组内标准差 ${r.sp.toFixed(2)}`);
  ok(Math.abs(r.familyError - 0.1426) < 0.0005 && doc.includes('14.3%'), '三次比较的族错误率 14.3%');
  const p13 = r.pairs.find((x) => x.pair === '1-3');
  const p23 = r.pairs.find((x) => x.pair === '2-3');
  ok(p13.p < p23.p, '甲−丙的 p 小于乙−丙的 p，与正文排序一致');
  return out;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  console.log('医学统计学 · 第 5 章 比较的不是两堆数，是差值除以它自己的抖动');
  console.log('');
  console.log(`三组各 ${r.n} 例，均值 ${r.means.join(' / ')}，组内标准差 ${r.sds.join(' / ')}`);
  console.log(`总均值 ${r.grand.toFixed(2)}；SSB=${r.ssb.toFixed(2)}（df=${r.dfb}），SSW=${r.ssw.toFixed(2)}（df=${r.dfw}）`);
  console.log(`F(${r.dfb},${r.dfw})=${r.F.toFixed(2)}，p=${r.p.toFixed(4)}；合并组内标准差 ${r.sp.toFixed(2)}`);
  console.log('两两比较（未校正）：');
  for (const x of r.pairs) console.log(`  ${x.pair}：差 ${x.diff.toFixed(2)}，t=${x.t.toFixed(2)}，p=${x.p.toFixed(3)}`);
  console.log(`三次比较的族错误率 1−0.95³=${(r.familyError * 100).toFixed(1)}%`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：F 只说明至少两组不同；两两比较次数必须事先限定，否则「显著」是算术。');
  console.log('※ 数字由本章正文汇总统计量现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意数据，不构成疗效结论或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, anova, pairwise, compute, fCDF, tCDF, DOC_PATH };
