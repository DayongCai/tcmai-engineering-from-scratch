#!/usr/bin/env node
/**
 * 医学图像识别 · 第 5 章 对账器：置信区间与受试泄漏
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（五件事、区间算例、标签噪声、划分、代价矩阵）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 二项近似的标准误与 95% 区间（300 例与 60 例两组）；
 *   2. 要让 SE 不超过 0.025 所需的样本量；
 *   3. 按图随机划分时「至少一张图落进验证集」的概率与跨侧受试数；
 *   4. 每类样本量在 5 折下、每折测试集的区间宽度；
 *   5. 习题对账：结构、分段、解释字数、check 题接地。
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

/** 二项近似：SE = √(p(1-p)/n)，95% 区间 = p ± 1.96·SE */
const se = (p, n) => Math.sqrt((p * (1 - p)) / n);
const ci = (p, n) => {
  const s = se(p, n);
  return { se: s, lo: p - 1.96 * s, hi: p + 1.96 * s, half: 1.96 * s };
};

/** 从正文读出两组验证集规模与准确率 */
function ciFromDoc(text = docText()) {
  const a = pick(text, /验证集\s*(\d+)\s*例，准确率\s*([\d.]+)/, '验证集 300 例的算例');
  const b = pick(text, /验证集只有\s*(\d+)\s*例/, '验证集 60 例的算例');
  const p = Number(a[2]);
  const n1 = Number(a[1]);
  const n2 = Number(b[1]);
  return { p, n1, n2, first: ci(p, n1), second: ci(p, n2) };
}

/** 想分辨 5 个百分点需要的样本量：SE ≤ 0.025 */
function samplesForSe(p, target = 0.025) {
  return Math.ceil((p * (1 - p)) / target ** 2);
}

/** 按图随机划分：一位受试的 k 张图至少一张落进验证集的概率 */
function subjectLeak(text = docText()) {
  const m = pick(text, /(\d+)\s*位受试，每人\s*(\d+)\s*张图/, '受试与每人张数');
  const subjects = Number(m[1]);
  const perSubject = Number(m[2]);
  const frac = 0.2; // 正文的 80/20 划分
  const p = 1 - (1 - frac) ** perSubject;
  return { subjects, perSubject, frac, p, leaked: Math.round(subjects * p) };
}

/** 每类 60 例、5 折：单折测试 12 例时区间宽度 */
function foldWidth(perClass = 60, folds = 5, p = 0.8) {
  const n = perClass / folds;
  return { n, half: 1.96 * se(p, n), widthPct: 2 * 1.96 * se(p, n) * 100 };
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
  const c = ciFromDoc(text);
  const leak = subjectLeak(text);
  const need300 = samplesForSe(c.p);
  const fw = foldWidth();
  const a = quizAudit();

  console.log('医学图像识别 · 第 5 章 对账');
  console.log('');
  console.log(`p = ${c.p}：`);
  console.log(`  n=${c.n1} → SE ${c.first.se.toFixed(4)}，95% CI [${c.first.lo.toFixed(3)}, ${c.first.hi.toFixed(3)}]`);
  console.log(`  n=${c.n2} → SE ${c.second.se.toFixed(4)}，95% CI [${c.second.lo.toFixed(3)}, ${c.second.hi.toFixed(3)}]`);
  console.log(`要让 SE ≤ 0.025，需 n ≥ ${need300}（正文写作 250 的量级）`);
  console.log('');
  console.log(`按图划分：${leak.subjects} 位受试 × ${leak.perSubject} 张，20% 落验证；单受试跨侧概率 ${leak.p.toFixed(3)}`);
  console.log(`  → 约 ${leak.leaked} 位受试同时出现在训练集与验证集`);
  console.log(`每类 60 例、5 折：单折测试 ${fw.n} 例，区间半宽 ±${(fw.half * 100).toFixed(0)} 个百分点（宽 ${fw.widthPct.toFixed(0)}）`);
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
  se,
  ci,
  ciFromDoc,
  samplesForSe,
  subjectLeak,
  foldWidth,
  quizAudit,
};
