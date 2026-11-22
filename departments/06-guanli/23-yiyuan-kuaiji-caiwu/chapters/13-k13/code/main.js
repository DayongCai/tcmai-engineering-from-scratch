#!/usr/bin/env node
/**
 * 医院会计与财务管理 · 第 13 章 权重就是政策
 * 课程正文: departments/06-guanli/23-yiyuan-kuaiji-caiwu/chapters/13-k13/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文两组算式：四维得分在两套权重下的加权总分，以及两个院感方案的
 * 成本效果比、增量成本效果比与净收益。脚本从正文抓数重算，再逐项对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function parseParams(doc) {
  const int = (re, label) => {
    const m = doc.match(re);
    if (!m) throw new Error(`正文里找不到${label}`);
    return Number(m[1].replace(/,/g, ''));
  };
  const score = (name) => {
    const m = doc.match(new RegExp(`\\|\\s*${name}\\s*\\|\\s*(\\d+)\\s*\\|\\s*(\\d+)\\s*\\|\\s*(\\d+)\\s*\\|\\s*(\\d+)`));
    if (!m) throw new Error(`正文里找不到${name}的四维得分`);
    return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  };
  const wA = doc.match(/按财务\s*(\d+)%、客户\s*(\d+)%、流程\s*(\d+)%、学习\s*(\d+)%/);
  if (!wA) throw new Error('正文里找不到权重甲');
  const wB = doc.match(/把财务权重提到\s*(\d+)%（客户\s*(\d+)%、流程\s*(\d+)%、学习\s*(\d+)%）/);
  if (!wB) throw new Error('正文里找不到权重乙');
  const plan = (name) => {
    const m = doc.match(new RegExp(`\\|\\s*${name}[^|]*\\|\\s*([\\d,]+)\\s*\\|\\s*([\\d.]+)‰\\s*\\|\\s*([\\d.]+)\\s*\\|\\s*\\*{0,2}([\\d.]+)\\*{0,2}\\s*\\|\\s*([\\d.]+)\\s*\\|\\s*\\*{0,2}([\\d.]+)\\*{0,2}`));
    if (!m) throw new Error(`正文里找不到${name}方案`);
    return {
      cost: Number(m[1].replace(/,/g, '')),
      rate: Number(m[2]),
      avoided: Number(m[3]),
      cer: Number(m[4]),
      saved: Number(m[5]),
      net: Number(m[6]),
    };
  };
  const base = doc.match(/中心静脉导管日\s*([\d,]+)\s*天\/年，基线导管相关血流感染率\s*([\d.]+)‰/);
  if (!base) throw new Error('正文里找不到导管日与基线感染率');
  return {
    a: score('甲科'),
    b: score('乙科'),
    wA: [...wA].slice(1).map(Number),
    wB: [...wB].slice(1).map(Number),
    catheterDays: Number(base[1].replace(/,/g, '')),
    baseRate: Number(base[2]),
    planA: plan('A'),
    planB: plan('B'),
    threshold: Number((doc.match(/延长住院损失按\s*([\d.]+)\s*万元计/) || [])[1]),
  };
}

function compute(p) {
  const weighted = (scores, w) => scores.reduce((s, x, i) => s + (x * w[i]) / 100, 0);
  const baseCases = (p.catheterDays * p.baseRate) / 1000;
  const aCases = (p.catheterDays * p.planA.rate) / 1000;
  const bCases = (p.catheterDays * p.planB.rate) / 1000;
  return {
    scoreA: weighted(p.a, p.wA),
    scoreB: weighted(p.b, p.wA),
    scoreA2: weighted(p.a, p.wB),
    scoreB2: weighted(p.b, p.wB),
    flip: weighted(p.a, p.wA) < weighted(p.b, p.wA) && weighted(p.a, p.wB) > weighted(p.b, p.wB),
    baseCases,
    avoidA: baseCases - aCases,
    avoidB: baseCases - bCases,
    cerA: p.planA.cost / (baseCases - aCases),
    cerB: p.planB.cost / (baseCases - bCases),
    icer: (p.planA.cost - p.planB.cost) / ((baseCases - aCases) - (baseCases - bCases)),
  };
}

const wan = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

function assertDocNumbers(doc, p, r) {
  const report = [];
  const expect = (ok, label) => {
    if (!ok) throw new Error(`正文对账失败：${label}`);
    report.push(label);
  };
  expect(Math.abs(r.scoreA - 76.0) < 0.05 && Math.abs(r.scoreB - 82.0) < 0.05 && doc.includes('76.0'), '权重甲：甲 76.0、乙 82.0');
  expect(Math.abs(r.scoreA2 - 79.5) < 0.05 && Math.abs(r.scoreB2 - 78.2) < 0.05 && doc.includes('79.5'), '权重乙：甲 79.5、乙 78.2');
  expect(r.flip, '改权重即可翻转排名');
  expect(Math.abs(r.baseCases - 76.8) < 1e-9, '基线感染 24,000 × 3.2‰ = 76.8 例');
  expect(Math.abs(r.avoidA - 43.2) < 1e-9 && Math.abs(r.avoidB - 19.2) < 1e-9, 'A 避免 43.2 例、B 避免 19.2 例');
  expect(Math.abs(r.cerA - 4.17) < 0.01 && Math.abs(r.cerB - 3.65) < 0.01 && doc.includes('4.17'), 'CER：A 4.17、B 3.65');
  expect(Math.abs(r.icer - 4.58) < 0.01 && doc.includes('4.58 万元/例'), 'ICER 110 ÷ 24 = 4.58');
  expect(p.planA.net === 100.8 && p.planB.net === 54.8, '净收益 A 100.8、B 54.8');
  expect(p.threshold === 6.5, '阈值 6.5 万元/例');
  return report;
}

function main() {
  const doc = readDoc();
  const p = parseParams(doc);
  const r = compute(p);

  console.log('医院会计与财务管理 · 第 13 章 权重就是政策');
  console.log('');
  console.log(`四维得分：甲科 ${p.a.join(' / ')}，乙科 ${p.b.join(' / ')}（财务 / 客户 / 流程 / 学习）`);
  console.log(`权重甲 ${p.wA.join('/')}：甲 ${r.scoreA.toFixed(1)}、乙 ${r.scoreB.toFixed(1)}`);
  console.log(`权重乙 ${p.wB.join('/')}：甲 ${r.scoreA2.toFixed(1)}、乙 ${r.scoreB2.toFixed(1)}　→ ${r.flip ? '排名翻转' : '排名未变'}`);
  console.log('');
  console.log(`院感（导管日 ${wan(p.catheterDays)}）：基线 ${wan(r.baseCases)} 例`);
  console.log(`  A 投入 ${wan(p.planA.cost)} 万元，避免 ${wan(r.avoidA)} 例，CER ${r.cerA.toFixed(2)}，净收益 ${wan(p.planA.net)} 万元`);
  console.log(`  B 投入 ${wan(p.planB.cost)} 万元，避免 ${wan(r.avoidB)} 例，CER ${r.cerB.toFixed(2)}，净收益 ${wan(p.planB.net)} 万元`);
  console.log(`  ICER(A 相对 B) = (${wan(p.planA.cost)} − ${wan(p.planB.cost)}) ÷ (${wan(r.avoidA)} − ${wan(r.avoidB)}) = ${r.icer.toFixed(2)} 万元/例 < 阈值 ${p.threshold}`);
  console.log('结论：权重就是政策；平均比挑小方案，增量比才说大方案值不值。');
  console.log('');
  for (const line of assertDocNumbers(doc, p, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('※ 加权总分与 ICER 由本章正文现算，正文改数后会直接抛错。');
  console.log('※ 教学示意，不构成绩效分配方案或感染防控技术规范。');
}

if (require.main === module) main();

module.exports = { readDoc, parseParams, compute, assertDocNumbers, DOC_PATH };
