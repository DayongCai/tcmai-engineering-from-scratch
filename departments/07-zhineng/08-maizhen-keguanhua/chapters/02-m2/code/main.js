#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 2 章 朴素贝叶斯：先验选错了，后验算得再准也是错的
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/02-m2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取两个先验（门诊 30%、社区 3%），现算它们的几率比；再按正文的
 * 「不足 1%」算一次健康人群的情形。另把拉普拉斯平滑的量级摊开。
 * 所有概率都是从正文数字直接算的算式，不是任何真实研究的患病率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '朴素贝叶斯：先验选错了，后验算得再准也是错的';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 几率：p / (1 − p)。p 用百分数传入。 */
function odds(percent) {
  const p = percent / 100;
  if (!(p > 0 && p < 1)) throw new Error('先验必须落在 0 与 100 之间: ' + percent);
  return p / (1 - p);
}

/** 同一套似然下，两个先验造成的后验几率比。 */
function oddsRatio(pA, pB) {
  return odds(pA) / odds(pB);
}

/** 拉普拉斯平滑后的似然：count / n，加 α 伪计数、k 个取值。 */
function laplace(count, n, alpha, k) {
  return (count + alpha) / (n + alpha * k);
}

/** 正文里的百分数，按出现顺序去重（第一个是门诊先验，第二个是社区先验）。 */
function priorsFromBody(text) {
  const hits = [...String(text).matchAll(/占\s*(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]));
  return [...new Set(hits)];
}

function sections(text) {
  const out = [];
  let cur = { title: '（题解）', lines: [] };
  for (const line of String(text).split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { out.push(cur); cur = { title: h[1], lines: [] }; continue; }
    cur.lines.push(line);
  }
  out.push(cur);
  return out.map((s) => ({
    title: s.title,
    body: s.lines.join('\n'),
    hanzi: (s.lines.join('\n').match(HANZI) || []).length,
  })).filter((s) => s.title !== '（题解）');
}

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const priors = priorsFromBody(body);
  const ratio = priors.length >= 2 ? oddsRatio(priors[0], priors[1]) : NaN;
  const health = 1;
  const secs = sections(body);
  const useSec = secs.find((s) => /正确选择的那些场合/.test(s.title));
  const uses = useSec ? (useSec.body.match(/^\s*\d+\.\s+/gm) || []).length : 0;
  const rows = (body.match(/^\|\s*P\([^|]*\|/gm) || []).length;
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections: secs,
    priors,
    ratio,
    ratioHealth: priors.length ? oddsRatio(priors[0], health) : NaN,
    uses,
    rows,
  };
}

function main() {
  const text = read();
  const a = analyze(text);
  const [clinic, community] = a.priors;

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 三项对照 ${a.rows} 行 · 适用场合 ${a.uses} 条`);
  console.log('');
  console.log(`正文给出的两个先验：门诊 ${clinic}% · 社区 ${community}%`);
  console.log(`  门诊几率 ${odds(clinic).toFixed(3)} ÷ 社区几率 ${odds(community).toFixed(3)} ≈ ${a.ratio.toFixed(1)} 倍`);
  console.log(`  同一套似然下，后验几率随之差这么多 —— 公式没错，错的是先验的人群。`);
  console.log(`  再换到健康人群（不足 ${1}%）：约 ${a.ratioHealth.toFixed(1)} 倍。`);
  console.log('');
  console.log('拉普拉斯平滑的量级（演算设定：20 例里该组合出现 0 次，取值 2 个）：');
  for (const al of [0, 0.1, 1, 10]) {
    console.log(`  α = ${String(al).padEnd(4)} → 似然 ${laplace(0, 20, al, 2).toFixed(5)}`);
  }
  console.log('  → 不平滑就归零，整个后验跟着归零；平滑系数是代价，须写进方法。');
  console.log('');
  console.log('※ 30% 与 3% 是正文的示意算式，用来说明先验对后验的放大效应，不是真实患病率。');
  console.log('※ 本章不给任何证型的实际先验、似然或模型性能数字；输出用于教学，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, odds, oddsRatio, laplace, priorsFromBody, sections };
