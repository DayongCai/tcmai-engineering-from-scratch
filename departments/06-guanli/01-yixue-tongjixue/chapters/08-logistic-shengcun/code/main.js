#!/usr/bin/env node
/**
 * 医学统计学 · 第 8 章 时间一进模型，删失就不能当成缺失
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/08-logistic-shengcun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文的 16/40 与 12/80、OR=3.78、两条 KM 曲线的事件数与删失数都从正文读出。
 * OR、风险比、不同基线下的绝对风险与 EPV 上限在这里现算，再与正文数字对账。
 * KM 曲线本身需要逐例随访时间，正文未给出，脚本只核对其事件数与删失数之和。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function odds(p) {
  return p / (1 - p);
}

function riskFromOdds(o) {
  return o / (1 + o);
}

function cohort(a, n1, c, n2) {
  const p1 = a / n1;
  const p2 = c / n2;
  const or = (a / (n1 - a)) / (c / (n2 - c));
  return { a, n1, c, n2, p1, p2, or, rr: p1 / p2, odds1: odds(p1), odds2: odds(p2) };
}

function absoluteFromBase(base, orValue) {
  const p0 = base;
  const p1 = riskFromOdds(odds(p0) * orValue);
  return { p0, p1, diffPp: (p1 - p0) * 100 };
}

function parseKmRow(doc, label) {
  const re = new RegExp(`^\\|\\s*${label}\\s*\\|\\s*(\\d+)\\s*\\|\\s*(\\d+)\\s*\\|\\s*(\\d+)\\s*\\|\\s*(\\d+)%\\s*\\|`, 'm');
  const m = doc.match(re);
  if (!m) throw new Error(`正文里找不到 ${label} 组的 KM 表行`);
  return { n: Number(m[1]), events: Number(m[2]), censored: Number(m[3]), km: Number(m[4]) / 100 };
}

function compute(doc) {
  const e = doc.match(/暴露组\s*(\d+)\s*例中\s*(\d+)\s*例发生结局/);
  const u = doc.match(/非暴露组\s*(\d+)\s*例中\s*(\d+)\s*例/);
  if (!e || !u) throw new Error('正文里找不到暴露组或非暴露组的频数');
  const c = cohort(Number(e[2]), Number(e[1]), Number(u[2]), Number(u[1]));
  const b1 = doc.match(/基线风险（非暴露组）\| 暴露组风险[\s\S]*?\|\s*10%\s*\|\s*([\d.]+)%\s*\|\s*([\d.]+)\s*个百分点\s*\|/);
  const base10Stated = b1 ? { p1: Number(b1[1]), diff: Number(b1[2]) } : null;
  return {
    cohort: c,
    base10: { ...absoluteFromBase(0.10, c.or), stated: base10Stated },
    base20: absoluteFromBase(0.20, c.or),
    kmA: parseKmRow(doc, '甲'),
    kmB: parseKmRow(doc, '乙'),
    epvMax: Math.floor(20 / 10),
  };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  const c = r.cohort;
  ok(Math.abs(c.or - 3.78) < 0.01, `OR=${c.or.toFixed(2)}`);
  ok(Math.abs(c.rr - 2.67) < 0.01, `风险比 ${c.rr.toFixed(2)}`);
  ok(Math.abs(c.odds1 - 0.667) < 0.002, `暴露组 odds=${c.odds1.toFixed(3)}`);
  ok(Math.abs(c.odds2 - 0.176) < 0.002, `非暴露组 odds=${c.odds2.toFixed(3)}`);
  ok(Math.abs(r.base10.p1 * 100 - 29.6) < 0.1 && doc.includes('29.6%'), '基线 10% 时暴露组风险 29.6%');
  ok(Math.abs(r.base10.diffPp - 19.6) < 0.1 && doc.includes('19.6 个百分点'), '绝对差 19.6 个百分点');
  ok(Math.abs(r.base20.p1 * 100 - 48.6) < 0.1 && doc.includes('48.6%'), '基线 20% 时暴露组风险 48.6%');
  ok(r.kmA.events + r.kmA.censored === r.kmA.n && r.kmB.events + r.kmB.censored === r.kmB.n, 'KM 表事件数加删失数等于各组 n');
  ok(r.kmA.km === 0.65 && r.kmB.km === 0.45, 'KM 24 个月缓解率为 65% 与 45%');
  ok(r.epvMax === 2 && doc.includes('最多装 2 个自变量'), '20 个事件按 EPV≥10 最多装 2 个变量');
  return out;
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  const c = r.cohort;
  console.log('医学统计学 · 第 8 章 时间一进模型，删失就不能当成缺失');
  console.log('');
  console.log(`队列：暴露 ${c.a}/${c.n1}（${pct(c.p1)}），非暴露 ${c.c}/${c.n2}（${pct(c.p2)}）`);
  console.log(`OR=${c.or.toFixed(2)}，风险比=${c.rr.toFixed(2)}；odds ${c.odds1.toFixed(3)} vs ${c.odds2.toFixed(3)}`);
  console.log(`同一 OR 换基线：10% → ${pct(r.base10.p1)}（差 ${r.base10.diffPp.toFixed(1)} 个百分点）`);
  console.log(`                   20% → ${pct(r.base20.p1)}（差 ${r.base20.diffPp.toFixed(1)} 个百分点）`);
  console.log(`KM 表：甲 ${r.kmA.events} 事件 + ${r.kmA.censored} 删失 = ${r.kmA.n}，24 个月 ${pct(r.kmA.km)}；乙 ${r.kmB.events} + ${r.kmB.censored} = ${r.kmB.n}，${pct(r.kmB.km)}`);
  console.log(`20 个事件按 EPV≥10 最多容纳 ${r.epvMax} 个自变量`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：OR 不是风险倍数；删失是信息，不是缺失；曲线分开不等于检验显著。');
  console.log('※ 数字由本章正文频数现算，KM 曲线需逐例随访时间、正文未给，只核对表内计数。');
  console.log('※ 教学示意数据，不构成预后判断或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, cohort, absoluteFromBase, parseKmRow, compute, DOC_PATH };
