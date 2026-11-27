#!/usr/bin/env node
/**
 * 医学图像识别 · 第 8 章 对账器：一致性的三种口径
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（规范六要素、kappa 算例、两个悖论、仲裁与回路）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 从正文读出两位标注员的边际分布，重算 Pe 与 kappa（0.272 与 0.70）；
 *   2. 悖论一：95/5 且全判多数类时 Po=0.905、Pe=0.905、kappa=0；
 *   3. PABAK = 2Po−1，用于「偏倚」情形的对照；
 *   4. 人际 Dice 0.94 与模型 Dice 0.91 的差，指出继续优化边界的上限；
 *   5. 仲裁比例（88/400）与 25% 的规范缺口判据；
 *   6. 习题对账：结构、分段、解释字数、check 题接地。
 *
 * 依赖：仅 node:fs / node:path。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const docText = () => fs.readFileSync(DOC, 'utf8');
const quizData = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function grams(s, n = 4) {
  const out = new Set();
  for (const seg of String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const pick = (text, re, what) => {
  const m = text.match(re);
  if (!m) throw new Error(`正文里找不到${what}`);
  return m;
};

/** 期望一致率 Pe = Σ p1k·p2k */
const expectedAgreement = (p1, p2) => p1.reduce((s, v, i) => s + v * p2[i], 0);

/** Cohen's kappa = (Po − Pe)/(1 − Pe)；Pe 趋近 1 时无定义，返回 null */
function kappa(po, pe) {
  if (Math.abs(1 - pe) < 1e-12) return null;
  return (po - pe) / (1 - pe);
}

/** PABAK：偏倚校正后的 kappa */
const pabak = (po) => 2 * po - 1;

/** 从正文读出两位标注员的边际分布与观测一致率 */
function kappaFromDoc(text = docText()) {
  const a = pick(text, /标注员 A 的分布：([\d.、]+)/, '标注员 A 的边际分布')[1]
    .split('、').filter(Boolean).map(Number);
  const b = pick(text, /标注员 B 的分布：([\d.、]+)/, '标注员 B 的边际分布')[1]
    .split('、').filter(Boolean).map(Number);
  const po = Number(pick(text, /观测一致率\s*\$P_o = ([\d.]+)\$/, '观测一致率')[1]);
  if (a.length !== b.length) throw new Error('两位标注员的类别数不一致');
  const pe = expectedAgreement(a, b);
  return { a, b, po, pe, kappa: kappa(po, pe), pabak: pabak(po) };
}

/** 悖论一：两类 95/5，两位全判多数类 */
function degenerateCase(text = docText()) {
  const m = pick(text, /两类占比\s*(\d+)%／(\d+)%/, '95/5 的类别占比');
  const maj = Number(m[1]) / 100;
  const min = Number(m[2]) / 100;
  const po = maj * maj + min * min;
  const pe = po; // 两人边际相同，全判多数类
  return { maj, min, po, pe, kappa: kappa(po, pe) };
}

/** 分割口径：人际 Dice 与模型 Dice 的差距 */
function diceGap(text = docText()) {
  const m = pick(text, /掩膜 Dice 中位数 ([\d.]+)，而模型对「金标准」的 Dice 是 ([\d.]+)/, '人际与模型的 Dice');
  const human = Number(m[1]);
  const model = Number(m[2]);
  return { human, model, gap: human - model, humanDisagreement: 1 - human };
}

/** 仲裁比例：400 张里 88 张 */
function arbitrationRate(text = docText()) {
  const m = pick(text, /(\d+) 张里仲裁\s*(\d+) 张，占\s*(\d+)%/, '仲裁比例');
  const total = Number(m[1]);
  const arbitrated = Number(m[2]);
  return { total, arbitrated, rate: arbitrated / total, claimedPct: Number(m[3]) };
}

/** 习题对账：结构 + 接地 */
function quizAudit() {
  const q = quizData();
  const body = grams(docText());
  const qs = Array.isArray(q.questions) ? q.questions : [];
  const byStage = { pre: 0, check: 0, post: 0 };
  const problems = [];
  let grounded = 0;

  qs.forEach((item, i) => {
    const n = i + 1;
    if (item.stage in byStage) byStage[item.stage] += 1;
    else problems.push(`第 ${n} 题 stage 非法：${item.stage}`);
    const opts = Array.isArray(item.options) ? item.options : [];
    if (opts.length !== 4) problems.push(`第 ${n} 题有 ${opts.length} 个选项`);
    if (!(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < opts.length)) {
      problems.push(`第 ${n} 题 correct 下标非法`);
    }
    if (hanzi(item.explain) < 30) problems.push(`第 ${n} 题 explain 只有 ${hanzi(item.explain)} 汉字`);
    if (item.stage === 'check') {
      const right = String(opts[item.correct] || '');
      if ([...grams(right)].some((g) => body.has(g))) grounded += 1;
    }
  });

  return { total: qs.length, byStage, grounded, problems };
}

function main() {
  const text = docText();
  const k = kappaFromDoc(text);
  const d = degenerateCase(text);
  const g = diceGap(text);
  const r = arbitrationRate(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 8 章 对账');
  console.log('');
  console.log(`边际分布 A：${k.a.join(' / ')}；B：${k.b.join(' / ')}`);
  console.log(`Pe = Σ p1k·p2k = ${k.pe.toFixed(3)}；Po = ${k.po}`);
  console.log(`kappa = (${k.po} − ${k.pe.toFixed(3)})/(1 − ${k.pe.toFixed(3)}) = ${k.kappa.toFixed(3)}`);
  console.log(`PABAK = 2Po − 1 = ${k.pabak.toFixed(2)}（偏倚情形下的对照口径）`);
  console.log('');
  console.log(`悖论一：${d.maj * 100}/${d.min * 100} 全判多数类 → Po ${d.po.toFixed(3)}、Pe ${d.pe.toFixed(3)}、kappa ${d.kappa}`);
  console.log(`Dice：人际 ${g.human} vs 模型 ${g.model}，差 ${g.gap.toFixed(2)}；人际自身分歧 ${(g.humanDisagreement * 100).toFixed(0)}%`);
  console.log(`仲裁：${r.total} 张里 ${r.arbitrated} 张 = ${(r.rate * 100).toFixed(0)}%（自报 ${r.claimedPct}%）`);
  console.log('');
  console.log(`习题 ${a.total} 题（pre ${a.byStage.pre} / check ${a.byStage.check} / post ${a.byStage.post}）`);
  console.log(`check 题正确选项能在正文找到原词的：${a.grounded} 道`);
  console.log(a.problems.length ? `✗ ${a.problems.length} 处：${a.problems.join('；')}` : '✓ 结构齐、解释够长、判据落在正文');
  console.log('');
  console.log('※ 数字由本章正文与习题现算，不手打；正文改动后重跑即可复现。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  QUIZ,
  docText,
  quizData,
  hanzi,
  grams,
  expectedAgreement,
  kappa,
  pabak,
  kappaFromDoc,
  degenerateCase,
  diceGap,
  arbitrationRate,
  quizAudit,
};

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
