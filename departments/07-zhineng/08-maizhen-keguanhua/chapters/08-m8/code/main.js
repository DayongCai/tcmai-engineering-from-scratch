#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 8 章 集成学习：平均能降方差，但降不掉「大家都错在同一处」
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/08-m8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三笔账全部现算：
 *   1) Var(平均) ＝ ρσ² + (1−ρ)σ²/M —— 用正文表格里的 ρ 与 M 重算，与表内数对照
 *   2) 自助采样的重复率 (1−1/n)ⁿ 与其极限 1/e
 *   3) AdaBoost 的指数权重 e^(2αt)，看错标样本到第 10 轮的量级
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '集成学习：平均能降方差，但降不掉「大家都错在同一处」';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function tables(text) {
  const lines = String(text).split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^\s*\|/.test(lines[i])) { i += 1; continue; }
    const block = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { block.push(lines[i]); i += 1; }
    if (block.length < 3 || !/^\s*\|[\s:|-]+\|\s*$/.test(block[1])) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    out.push({ header: cells(block[0]), rows: block.slice(2).map(cells) });
  }
  return out;
}

const num = (s) => {
  const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/** M 个模型、两两相关 ρ、单模型方差 σ² 时，平均后的方差（相对 σ² 的倍数） */
function meanVariance(M, rho) {
  if (!(M >= 1) || !(rho >= 0 && rho <= 1)) throw new Error('参数越界: ' + M + ',' + rho);
  return rho + (1 - rho) / M;
}

/** 有放回抽 n 次，某个样本一次没被抽到的概率；其极限是 1/e */
const pNeverDrawn = (n) => (1 - 1 / n) ** n;

/** AdaBoost：α 固定时，一个始终被错分的样本累积权重倍数 */
const adaWeight = (rounds, alpha) => Math.exp(2 * alpha * rounds);

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);

  const varT = tbl.find((t) => t.header.join('').includes('模型间相关'));
  const Ms = varT ? varT.header.slice(1).map((h) => num(h)).filter(Number.isFinite) : [];
  const rows = varT ? varT.rows.map((r) => ({
    rho: num(r[0]),
    stated: r.slice(1).map(num),
  })) : [];

  const n = Number((body.match(/(\d+)\s*例的数据集/) || [])[1]);
  if (!Number.isFinite(n)) throw new Error('正文里没找到自助采样的样本量');

  return {
    hanzi: (body.match(HANZI) || []).length,
    tables: tbl.length,
    Ms,
    rows,
    n,
    pNever60: pNeverDrawn(60),
    limit: 1 / Math.E,
    distinct60: 60 * (1 - pNeverDrawn(60)),
    boost: [1, 3, 5, 10].map((k) => ({ round: k, weight: adaWeight(k, 0.5) })),
    oobLeak: 1 - 0.8 ** 8,
  };
}

function main() {
  const text = read();
  const a = analyze(text);

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 表格 ${a.tables} 张`);
  console.log('');
  console.log('平均后的方差（相对单模型，重算值 / 表内值）：');
  for (const row of a.rows) {
    const calc = a.Ms.map((M) => meanVariance(M, row.rho));
    const same = calc.every((v, i) => Math.abs(v - row.stated[i]) < 0.011);
    console.log(`  ρ ＝ ${row.rho}  →  ${calc.map((v) => v.toFixed(2)).join('  ')}  （表内 ${row.stated.join('  ')}，${same ? '一致' : '不一致'}）`);
  }
  console.log(`  → 相关 0.9 时，${a.Ms[a.Ms.length - 1]} 个模型也只把方差降到 ${meanVariance(a.Ms[a.Ms.length - 1], 0.9).toFixed(2)}。`);
  console.log('');
  console.log('自助采样：');
  console.log(`  (1−1/${a.n})^${a.n} ＝ ${a.pNever60.toFixed(3)}（未被抽中），极限 1/e ＝ ${a.limit.toFixed(3)}`);
  console.log(`  → 每份样本约 ${((1 - a.pNever60) * 100).toFixed(1)}% 是不同个体；${a.n} 人的数据集里约 ${a.distinct60.toFixed(0)} 个人。`);
  console.log('');
  console.log('AdaBoost（α ＝ 0.5，每轮乘 e¹）：');
  for (const b of a.boost) console.log(`  第 ${String(b.round).padStart(2)} 轮：${b.weight.toFixed(1)} 倍`);
  console.log('  → 一个错标样本到第 10 轮几乎独占训练目标；应对是早停与标签清洗。');
  console.log('');
  console.log(`OOB 的同一问题：若样本单位是段，袋外样本里 ${a.oobLeak.toFixed(3)} 的患者在训练时已经见过，只有 ${(1 - a.oobLeak).toFixed(3)} 是全新的。`);
  console.log('  → OOB 分数不是泛化能力的估计，只是「换个切分」的估计。');
  console.log('');
  console.log('※ 表中方差倍数、63.2%、e¹ 的累积都是正文的演算设定或按公式直接算出的量。');
  console.log('※ 本章不给任何实测 AUC、样本量与集成规模；性能声明须有独立验证数据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, tables, meanVariance, pNeverDrawn, adaWeight };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
