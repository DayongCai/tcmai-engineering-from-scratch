#!/usr/bin/env node
/**
 * 医学生物学 · 第 14 章 群体遗传学：频率的账，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/14-qunti-yichuan-xue/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：由患病率 q² 反解 q、2pq 与「携带者∶患者」，以及突变—选择平衡的
 * q ≈ √(μ/s)，都从本章正文读出参数后计算。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '14';
const SLUG = '14-qunti-yichuan-xue';
const TITLE = '群体遗传学算的不是「谁会病」，是「这个变异在这个人群里能待多久」';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['哈迪-温伯格平衡', '随机交配', '遗传漂变', '迁移', '奠基者效应', '瓶颈效应', '阳性预测值'];

function readDoc(file) {
  return fs.readFileSync(file || DOC, 'utf8');
}

function lines(text) {
  return text.split(/\r?\n/);
}

function sections(text = readDoc()) {
  return lines(text)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function hanzi(text = readDoc()) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

/** 由患病率反解：q = √(q²)，2pq，携带者∶患者 = 2/q */
function hwFromPrevalence(q2) {
  const q = Math.sqrt(q2);
  const p = 1 - q;
  const carriers = 2 * p * q;
  return {
    q2,
    q,
    p,
    carriers,
    ratio: carriers / q2,
    approxRatio: 2 / q,
  };
}

/** 正文口径：q² = 1/10000、2pq ≈ 0.0198、比值约 2/q ≈ 200 */
function hwClaims(text = readDoc()) {
  const q2 = text.match(/q²\s*=\s*1\/(\d+)/);
  const carriers = text.match(/2pq\s*≈\s*([\d.]+)/);
  const ratio = text.match(/约为\s*2\/q[^。]*?此例约([一二两三四五六七八九十百]+)比一/);
  return {
    q2: q2 ? 1 / Number(q2[1]) : null,
    carriersStated: carriers ? Number(carriers[1]) : null,
    ratioZh: ratio ? ratio[1] : null,
  };
}

/** 突变—选择平衡：μ = 10⁻⁶、s = 1 → q ≈ √(μ/s)，携带者约 2q */
function mutationSelectionBalance(text = readDoc()) {
  const mu = text.match(/突变率为\s*μ、纯合子的选择系数为\s*s/);
  const numbers = text.match(/代入\s*μ\s*=\s*10[⁻-]?([⁰¹²³⁴⁵⁶⁷⁸⁹\d]+)、s\s*=\s*(\d+)/);
  const statedQ = text.match(/得\s*q\s*≈\s*([\d.]+)/);
  const statedCarrier = text.match(/携带者频率约([一二两三四五六七八九十千]+)分之([一二两三四五六七八九十]+)/);
  if (!mu || !numbers) return null;
  const SUP = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
  const exp = [...numbers[1]].map((ch) => (SUP[ch] !== undefined ? SUP[ch] : Number(ch))).join('');
  const muValue = Math.pow(10, -Number(exp));
  const s = Number(numbers[2]);
  const q = Math.sqrt(muValue / s);
  return {
    mu: muValue,
    s,
    q,
    carriers: 2 * (1 - q) * q,
    statedQ: statedQ ? Number(statedQ[1]) : null,
    statedCarrierZh: statedCarrier ? statedCarrier[1] + '分之' + statedCarrier[2] : null,
    statedCarrier: statedCarrier ? cnSimple(statedCarrier[2]) / cnSimple(statedCarrier[1]) : null,
  };
}

function cnSimple(s) {
  const D = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 千: 1000, 百: 100 };
  if (D[s]) return D[s];
  if (/^十[一二三四五六七八九]$/.test(s)) return 10 + D[s[1]];
  return Number(s) || NaN;
}

/** 五种力量表：力量 / 作用方式 / 对多样性的影响 / 时间尺度 */
function forceTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line)) continue;
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (/^力量$/.test(cells[0])) continue;
    rows.push({ force: cells[0], how: cells[1], diversity: cells[2], scale: cells[3] });
  }
  return rows;
}

/** 「一、」节平衡的五条前提（编号条目） */
function hwAssumptions(text = readDoc()) {
  const ls = lines(text);
  const start = ls.findIndex((l) => /^##\s*一、哈迪-温伯格平衡/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

/** 「六、」节三个陷阱 */
function traps(text = readDoc()) {
  const ls = lines(text);
  const start = ls.findIndex((l) => /^##\s*六、频率数据的三个陷阱/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

function boundaries(text = readDoc()) {
  const ls = lines(text);
  const start = ls.findIndex((l) => /^##\s*代价与边界/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+/.test(line)) out.push(line.replace(/^-\s+/, ''));
  }
  return out;
}

function summarize(text = readDoc()) {
  const hw = hwClaims(text);
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    hw: hw.q2 ? hwFromPrevalence(hw.q2) : null,
    hwClaim: hw,
    balance: mutationSelectionBalance(text),
    forces: forceTable(text),
    assumptions: hwAssumptions(text),
    traps: traps(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  const h = s.hw;
  const b = s.balance;
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('患病率 → 携带者频率（正文口径现算）：');
  console.log('  q² = ' + h.q2 + ' → q = ' + h.q + '，p = ' + h.p
    + '，2pq = ' + h.carriers.toFixed(4) + '（正文写 ' + s.hwClaim.carriersStated + '）');
  console.log('  携带者∶患者 = ' + h.ratio.toFixed(1) + '（2/q = ' + h.approxRatio.toFixed(1)
    + '，正文写约' + (s.hwClaim.ratioZh || '二百') + '比一）');
  console.log('  → 罕见病的风险主要藏在看不见的携带者身上。');
  console.log('');
  console.log('突变—选择平衡（正文参数现算）：');
  console.log('  μ = ' + b.mu.toExponential(0) + '、s = ' + b.s + ' → q ≈ ' + b.q
    + '（正文写 ' + b.statedQ + '），携带者 2pq ≈ ' + b.carriers.toFixed(4)
    + '（正文写 ' + b.statedCarrierZh + '）');
  console.log('  → 即使选择把患者全部淘汰，变异也不会消失。');
  console.log('');
  console.log('平衡五前提（' + s.assumptions.length + ' 条）：' + s.assumptions.join('、'));
  console.log('五种力量（' + s.forces.length + ' 种）：' + s.forces.map((f) => f.force).join('、'));
  console.log('三个陷阱（' + s.traps.length + ' 个）：' + s.traps.join('、'));
  console.log('');
  console.log('判据词命中（正文现算）：');
  for (const x of s.concepts) console.log('  ' + (x.hits ? '✓' : '✗') + ' ' + x.term + '：' + x.hits);
  console.log('');
  console.log('边界（「代价与边界」一节，取前 3 条）：');
  s.boundaries.slice(0, 3).forEach((x) => console.log('  - ' + x));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TITLE, CONCEPTS,
  readDoc, sections, hanzi, hwFromPrevalence, hwClaims, mutationSelectionBalance,
  forceTable, hwAssumptions, traps, conceptHits, missing, boundaries, summarize,
};
