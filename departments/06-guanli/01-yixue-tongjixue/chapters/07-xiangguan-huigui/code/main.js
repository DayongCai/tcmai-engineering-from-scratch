#!/usr/bin/env node
/**
 * 医学统计学 · 第 7 章 相关系数是斜率被两个标准差除过一遍
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/07-xiangguan-huigui/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文那张 18 对 (x, y) 的示意表被逐行读入，Pearson r、斜率、截距、r²、
 * 残差标准差、斜率区间与 Spearman 相关全部现算。
 * 再把第一个 y 改成 20 复算一次，验证「一个录入错误能毁掉 Pearson、毁不掉秩相关」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

/** 读取正文三列 (x,y) 的原始数据表 */
function parsePairs(doc) {
  const xs = [];
  const ys = [];
  const re = /^\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/gm;
  let m;
  while ((m = re.exec(doc)) !== null) {
    xs.push(Number(m[1]), Number(m[3]), Number(m[5]));
    ys.push(Number(m[2]), Number(m[4]), Number(m[6]));
  }
  if (xs.length < 6) throw new Error('正文里找不到 18 对原始数据');
  return { xs, ys };
}

function mean(v) {
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function pearson(x, y) {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i += 1) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return { r: sxy / Math.sqrt(sxx * syy), mx, my, sxy, sxx, syy };
}

function ranks(v) {
  const idx = v.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const r = new Array(v.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].x === idx[i].x) j += 1;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) r[idx[k].i] = avg;
    i = j + 1;
  }
  return r;
}

function spearman(x, y) {
  return pearson(ranks(x), ranks(y)).r;
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

function fit(x, y) {
  const p = pearson(x, y);
  const slope = p.sxy / p.sxx;
  const intercept = p.my - slope * p.mx;
  let sse = 0;
  for (let i = 0; i < x.length; i += 1) sse += (y[i] - (intercept + slope * x[i])) ** 2;
  const df = x.length - 2;
  const residSD = Math.sqrt(sse / df);
  const seSlope = residSD / Math.sqrt(p.sxx);
  const crit = tQuantile(0.975, df);
  return {
    r: p.r, r2: p.r ** 2, slope, intercept, residSD,
    sdY: Math.sqrt(p.syy / (y.length - 1)),
    ci: [slope - crit * seSlope, slope + crit * seSlope],
    spearman: spearman(x, y),
  };
}

function compute(doc) {
  const { xs, ys } = parsePairs(doc);
  const ysErr = ys.slice();
  ysErr[0] = 20;
  return { n: xs.length, xs, ys, fit: fit(xs, ys), fitErr: fit(xs, ysErr) };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  const f = r.fit;
  ok(r.n === 18, '原始表共 18 对');
  ok(Math.abs(f.r - 0.900) < 0.002 && doc.includes('r≈0.90'), `r=${f.r.toFixed(3)}`);
  ok(Math.abs(f.slope - 0.632) < 0.002, `斜率 ${f.slope.toFixed(3)}`);
  ok(Math.abs(f.intercept - 6.227) < 0.002, `截距 ${f.intercept.toFixed(3)}`);
  ok(Math.abs(f.r2 - 0.81) < 0.005, `r²=${f.r2.toFixed(3)}`);
  ok(Math.abs(f.residSD - 0.552) < 0.002, `残差标准差 ${f.residSD.toFixed(3)}`);
  ok(Math.abs(f.sdY - 1.232) < 0.002, `结局标准差 ${f.sdY.toFixed(3)}`);
  ok(Math.abs(f.ci[0] - 0.470) < 0.003 && Math.abs(f.ci[1] - 0.793) < 0.003, '斜率 95% CI 0.470～0.793');
  ok(Math.abs(r.fitErr.r - 0.032) < 0.002, `改一个 y 后 Pearson r=${r.fitErr.r.toFixed(3)}`);
  ok(Math.abs(r.fitErr.spearman - 0.608) < 0.003, `改一个 y 后 Spearman ρ=${r.fitErr.spearman.toFixed(3)}`);
  return out;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  const f = r.fit;
  console.log('医学统计学 · 第 7 章 相关系数是斜率被两个标准差除过一遍');
  console.log('');
  console.log(`正文原始表 ${r.n} 对 (x, y)，x 范围 ${Math.min(...r.xs)}–${Math.max(...r.xs)}`);
  console.log(`Pearson r=${f.r.toFixed(3)}，r²=${f.r2.toFixed(3)}，Spearman ρ=${f.spearman.toFixed(3)}`);
  console.log(`回归：截距 ${f.intercept.toFixed(3)}，斜率 ${f.slope.toFixed(3)}，95% CI ${f.ci[0].toFixed(3)}～${f.ci[1].toFixed(3)}`);
  console.log(`残差标准差 ${f.residSD.toFixed(3)}，结局标准差 ${f.sdY.toFixed(3)}`);
  console.log(`把一个 y 从 7.9 误录成 20：Pearson r=${r.fitErr.r.toFixed(3)}，Spearman ρ=${r.fitErr.spearman.toFixed(3)}`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：r 不带单位、不带因果；r² 回答解释了多少，斜率回答每单位改变多少。');
  console.log('※ 数字由本章正文原始表现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意数据，不构成因果结论或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parsePairs, pearson, spearman, fit, compute, DOC_PATH };
