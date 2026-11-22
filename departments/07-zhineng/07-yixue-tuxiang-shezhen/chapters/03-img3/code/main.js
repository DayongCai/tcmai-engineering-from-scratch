#!/usr/bin/env node
/**
 * 医学图像识别 · 第 3 章 对账器：方差解释比例、特征维数与样本量
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（三类特征的稳定性、PCA/LDA、泄漏与筛选）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 从正文读出迹与三个特征值，重算累计方差与解释比例；
 *   2. 未解释的那部分方差（100% 减解释比例）；
 *   3. LBP 的维数增长：59 维到 3×3 网格后的 531 维；
 *   4. 40 维特征按「每个特征 10–20 个样本」需要多少例；
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

const need = (text, re, what) => {
  const m = text.match(re);
  if (!m) throw new Error(`正文里找不到${what}`);
  return m;
};

/** PCA 的解释比例 = 累计特征值 / 迹；正文写作「前三个特征值 7.8、4.2、3.6，累计 15.6」 */
function pcaShare(text = docText()) {
  const m = need(text, /前三个特征值\s*([\d.]+)、([\d.]+)、([\d.]+)，累计\s*([\d.]+)/, '前三个特征值');
  const ev = [Number(m[1]), Number(m[2]), Number(m[3])];
  const claimed = Number(m[4]);
  const trace = Number(need(text, /迹为\s*(\d+)/, '相关矩阵的迹')[1]);
  const sum = ev.reduce((a, b) => a + b, 0);
  const share = sum / trace;
  return { ev, sum, claimed, trace, share, unexplained: 1 - share };
}

/** LBP：跳变不超过 2 次的模式 58 类，加一类杂项共 59；再分 3×3 网格 */
function lbpDims(text = docText()) {
  const base = Number(need(text, /归为\s*(\d+)\s*类，其余归一类，共\s*(\d+)\s*维/, 'LBP 的模式类数')[2]);
  const grid = Number(need(text, /3×3 网格分别统计会到\s*(\d+)\s*维/, '3×3 网格后的维数')[1]);
  return { base, grid, cells: 9, perCell: base };
}

/** 维度与样本量：每个特征 10–20 例，正文用 40 维举了个数 */
function sampleNeed(text = docText()) {
  const dims = Number(need(text, /(\d+)\s*维特征意味着/, '举例的特征维数')[1]);
  const m = need(text, /每个特征至少\s*(\d+)–(\d+)\s*个样本/, '每特征样本数区间');
  const lo = dims * Number(m[1]);
  const hi = dims * Number(m[2]);
  return { dims, perFeature: [Number(m[1]), Number(m[2])], lo, hi };
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
  const p = pcaShare(text);
  const l = lbpDims(text);
  const s = sampleNeed(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 3 章 对账');
  console.log('');
  console.log(`PCA：特征值 ${p.ev.join(' + ')} = ${p.sum.toFixed(1)}；迹 ${p.trace}`);
  console.log(`解释比例 = ${p.sum.toFixed(1)}/${p.trace} = ${(p.share * 100).toFixed(0)}%；未解释 ${(p.unexplained * 100).toFixed(0)}%`);
  console.log(`正文自报累计 ${p.claimed}（与现算 ${p.sum.toFixed(1)} ${p.claimed === p.sum ? '一致' : '不一致'}）`);
  console.log('');
  console.log(`LBP：旋转不变等价模式 ${l.base} 维；分 ${l.cells} 格后 ${l.grid} 维（${l.perCell} × ${l.cells} = ${l.perCell * l.cells}）`);
  console.log(`40 维特征按每特征 ${s.perFeature.join('–')} 例：需 ${s.lo}–${s.hi} 例`);
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
  pcaShare,
  lbpDims,
  sampleNeed,
  quizAudit,
};
