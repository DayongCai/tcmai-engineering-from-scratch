#!/usr/bin/env node
/**
 * 医学统计学 · 第 6 章 率的分母，比率的分子更容易骗人
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/06-kaifang-liebiao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文抓 40/60 与 25/60，现算两个率、率差、RR、OR、χ² 与 p；
 * 再按 OR 不变的假设复算不同基线下的绝对率差，与正文的 6.4 / 13.7 个百分点对账。
 * 配对表用 McNemar 复算，不套普通 χ²。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

/** 标准正态分布函数（Abramowitz–Stegun 7.1.26 的 erf 近似） */
function normalCDF(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** χ² 分布（df=1）上尾概率：等价于 2×(1−Φ(√x)) */
function chi2Df1P(x) {
  return 2 * (1 - normalCDF(Math.sqrt(x)));
}

function odds(p) {
  return p / (1 - p);
}

function riskFromOdds(o) {
  return o / (1 + o);
}

/** 2×2 表：a=试验有效，b=试验无效，c=对照有效，d=对照无效 */
function twoByTwo(a, b, c, d) {
  const n1 = a + b;
  const n2 = c + d;
  const total = n1 + n2;
  const p1 = a / n1;
  const p2 = c / n2;
  const rd = p1 - p2;
  const rr = p1 / p2;
  const or = (a / b) / (c / d);
  const expected = [
    (n1 * (a + c)) / total, (n1 * (b + d)) / total,
    (n2 * (a + c)) / total, (n2 * (b + d)) / total,
  ];
  const observed = [a, b, c, d];
  let chi2 = 0;
  for (let i = 0; i < 4; i += 1) chi2 += (observed[i] - expected[i]) ** 2 / expected[i];
  return { n1, n2, total, p1, p2, rd, rr, or, expected, chi2, p: chi2Df1P(chi2) };
}

/** McNemar：b、c 是两个不一致格 */
function mcnemar(b, c) {
  const chi2 = (Math.abs(b - c) - 1) ** 2 / (b + c);
  return { b, c, chi2, p: chi2Df1P(chi2) };
}

function compute(doc) {
  const t = doc.match(/试验组\s*(\d+)\s*例\s*(\d+)\s*例有效/);
  const c = doc.match(/对照组\s*(\d+)\s*例\s*(\d+)\s*例有效/);
  if (!t || !c) throw new Error('正文里找不到 2×2 表的四个频数');
  const a = Number(t[2]);
  const b = Number(t[1]) - a;
  const cc = Number(c[2]);
  const d = Number(c[1]) - cc;
  const table = twoByTwo(a, b, cc, d);
  const base = (pct, orValue) => {
    const p0 = pct / 100;
    const p1 = riskFromOdds(odds(p0) * orValue);
    return { p0, p1, diffPp: (p1 - p0) * 100 };
  };
  const b1 = (doc.match(/对照组有效率是\s*(\d+)%\s*时率差只有\s*([\d.]+)\s*个百分点/) || []);
  const b2 = (doc.match(/对照组是\s*(\d+)%\s*时率差是\s*([\d.]+)\s*个百分点/) || []);
  const m = doc.match(/前有效后无效\s*(\d+)\s*例、前无效后有效\s*(\d+)\s*例/);
  return {
    table, a, b, c: cc, d,
    base4: { pct: Number(b1[1] || 4), stated: Number(b1[2] || 6.4), ...base(Number(b1[1] || 4), table.or) },
    base10: { pct: Number(b2[1] || 10), stated: Number(b2[2] || 13.7), ...base(Number(b2[1] || 10), table.or) },
    mcnemar: m ? mcnemar(Number(m[1]), Number(m[2])) : null,
  };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  const t = r.table;
  ok(Math.abs(t.p1 * 100 - 66.7) < 0.05 && Math.abs(t.p2 * 100 - 41.7) < 0.05, '两个率 66.7% 与 41.7%');
  ok(Math.abs(t.rd * 100 - 25.0) < 0.05, '率差 25.0 个百分点');
  ok(Math.abs(t.rr - 1.60) < 0.005, '相对危险度 1.60');
  ok(Math.abs(t.or - 2.80) < 0.01, '比值比 2.80');
  ok(Math.abs(t.chi2 - 7.55) < 0.02, `χ²=${t.chi2.toFixed(2)}`);
  ok(Math.abs(t.p - 0.006) < 0.0006, `p=${t.p.toFixed(4)}`);
  ok(Math.abs(r.base4.diffPp - r.base4.stated) < 0.06, `基线 4% 时率差 ${r.base4.diffPp.toFixed(1)} 个百分点`);
  ok(Math.abs(r.base10.diffPp - r.base10.stated) < 0.06, `基线 10% 时率差 ${r.base10.diffPp.toFixed(1)} 个百分点`);
  ok(r.mcnemar && Math.abs(r.mcnemar.chi2 - 4.27) < 0.02, 'McNemar χ²=4.27');
  ok(r.mcnemar && Math.abs(r.mcnemar.p - 0.039) < 0.001, 'McNemar p≈0.039');
  return out;
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  const t = r.table;
  console.log('医学统计学 · 第 6 章 率的分母，比率的分子更容易骗人');
  console.log('');
  console.log(`2×2 表：试验 ${r.a}/${t.n1}，对照 ${r.c}/${t.n2}；率 ${pct(t.p1)} vs ${pct(t.p2)}`);
  console.log(`率差 ${(t.rd * 100).toFixed(1)} 个百分点，RR=${t.rr.toFixed(2)}，OR=${t.or.toFixed(2)}`);
  console.log(`χ²=${t.chi2.toFixed(2)}，df=1，p=${t.p.toFixed(4)}；期望频数 ${t.expected.map((x) => x.toFixed(1)).join(' / ')}`);
  console.log(`同一 OR 换基线：对照组 ${r.base4.pct}% → 试验组 ${pct(r.base4.p1)}（差 ${r.base4.diffPp.toFixed(1)} 个百分点）`);
  console.log(`                   对照组 ${r.base10.pct}% → 试验组 ${pct(r.base10.p1)}（差 ${r.base10.diffPp.toFixed(1)} 个百分点）`);
  if (r.mcnemar) console.log(`配对表：不一致格 ${r.mcnemar.b} 与 ${r.mcnemar.c}，McNemar χ²=${r.mcnemar.chi2.toFixed(2)}，p=${r.mcnemar.p.toFixed(3)}`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：卡方只检验独立；绝对差与相对比必须同报，OR 不能读成风险倍数。');
  console.log('※ 数字由本章正文频数现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意数据，不构成疗效结论或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, twoByTwo, mcnemar, compute, DOC_PATH };
