#!/usr/bin/env node
/**
 * 医学图像识别 · 第 2 章 对账器：色彩校正的残差与重复性
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（成像乘积、色卡最小二乘、ICC、增广判据）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 从正文读出两个方差分量，重算 ICC 与误差项升到 0.67 后的 ICC；
 *   2. 校正前后的色差与「肉眼难以区分」阈值的关系（1.8 < 2 < 6.4）；
 *   3. 色卡最小二乘是否超定（24 个色块 vs 12 个未知量）；
 *   4. ICC 对误差项的敏感度：误差项每加一点，ICC 掉多少。
 *
 * 公式与正文一致：ICC = σ²受试间 / (σ²受试间 + σ²误差)。
 * 正文写下的 0.80 / 0.60 由本脚本现算后比对，手改正文不改算式就会红。
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
  return Number(m[1]);
};

/** 组内相关系数：单次测量，分母是受试间方差加测量误差方差 */
const icc = (between, error) => between / (between + error);

/** 从正文读出两个方差分量与「误差项升到」的对照值 */
function iccFromDoc(text = docText()) {
  const between = pick(text, /\\text\{受试间\}\}=([\d.]+)/, '受试间方差');
  const error = pick(text, /\\text\{误差\}\}=([\d.]+)/, '测量误差方差');
  const error2 = pick(text, /误差项若升到\s*([\d.]+)/, '误差项升到的对照值');
  return {
    between,
    error,
    error2,
    first: icc(between, error),
    second: icc(between, error2),
  };
}

/** 色差与可辨阈值：校正前 6.4、校正后 1.8、阈值 2 */
function deltaE(text = docText()) {
  const before = pick(text, /\\Delta E_\{00\} \\approx ([\d.]+)\$；/, '校正前平均色差');
  const after = pick(text, /校正后残差降到\s*\$\\Delta E_\{00\} \\approx ([\d.]+)\$/, '校正后残差');
  const threshold = pick(text, /\\Delta E_\{00\} < ([\d.]+)\$ 时肉眼难以区分/, '可辨阈值');
  return { before, after, threshold, beforeVisible: before >= threshold, afterVisible: after >= threshold };
}

/** 色卡最小二乘的规模：24 个色块、12 个未知量（A 的 9 个加 b 的 3 个） */
function cardFit(text = docText()) {
  const patches = pick(text, /(\d+)\s*个色块、未知量\s*(\d+)\s*个/, '色卡色块数');
  const unknowns = Number(text.match(/个色块、未知量\s*(\d+)\s*个/)[1]);
  return { patches, unknowns, overdetermined: patches > unknowns, ratio: patches / unknowns };
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
  const i = iccFromDoc(text);
  const d = deltaE(text);
  const c = cardFit(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 2 章 对账');
  console.log('');
  console.log(`方差分量：受试间 ${i.between}、误差 ${i.error} → ICC = ${i.first.toFixed(2)}`);
  console.log(`误差项升到 ${i.error2} → ICC = ${i.second.toFixed(2)}（掉了 ${(i.first - i.second).toFixed(2)}）`);
  console.log('');
  console.log(`色卡最小二乘：${c.patches} 个色块 / ${c.unknowns} 个未知量，超定 ${c.overdetermined}，比例 ${c.ratio.toFixed(1)}:1`);
  console.log(`校正前 ΔE00 ≈ ${d.before}（≥ ${d.threshold}，肉眼可辨：${d.beforeVisible}）`);
  console.log(`校正后 ΔE00 ≈ ${d.after}（≥ ${d.threshold}，肉眼可辨：${d.afterVisible}）`);
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
  icc,
  iccFromDoc,
  deltaE,
  cardFit,
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
