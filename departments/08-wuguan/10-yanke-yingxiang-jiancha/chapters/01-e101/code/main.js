#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 1 章对账器
 *
 * 数据源只有两个，都在本目录旁边：
 *   ../docs/zh.md   本章正文（四区、五轮配属、两类信息、闸门四问都写在这一份里）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 四区在正文里的首见顺序；
 *   2. 五轮配属（部位—轮—脏）从正文的括注里解析出来，不手打；
 *   3. 「推不出」句数（正文把不可互换写成方向句）；
 *   4. 闸门三件的出现位置；
 *   5. 正文引到的共识节号；
 *   6. 习题对账：题量、分段、选项数、解释字数，以及 check 题正确选项能否在正文里找到原词。
 *
 * 依赖：仅 node:fs / node:path。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const ZONES = ['胞睑', '白睛', '黑睛', '瞳神'];

const docText = () => fs.readFileSync(DOC, 'utf8');
const quizData = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 连续汉字片段（n 字），用于判断「习题用词是不是正文里的词」 */
function grams(s, n = 4) {
  const out = new Set();
  for (const seg of String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 四区在正文里的首见顺序；indexOf 为 -1（正文没提到）的一律排到末尾 */
function zoneOrder(text = docText()) {
  return ZONES
    .map((z) => ({ zone: z, at: text.indexOf(z) }))
    .sort((a, b) => (a.at < 0 ? Infinity : a.at) - (b.at < 0 ? Infinity : b.at))
    .map((x) => x.zone);
}

/** 五轮配属：正文写作「**胞睑（肉轮，属脾）**」这类括注，逐条解析 */
function wulunPairs(text = docText()) {
  const re = /\*\*(胞睑|白睛|黑睛|瞳神)（(.)轮，属(.)）\*\*/g;
  return [...text.matchAll(re)].map((m) => ({ zone: m[1], wheel: `${m[2]}轮`, organ: m[3] }));
}

/** 正文用「推不出」立了几个不可互换的方向 */
function twoInfoDirections(text = docText()) {
  return (text.match(/推不出/g) || []).length;
}

/** 闸门三件（适应证、禁忌、知情）各自在正文里的位置，按出现先后排 */
function gates(text = docText()) {
  return ['适应证', '禁忌', '知情']
    .map((k) => ({ key: k, at: text.indexOf(k) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);
}

/** 正文引到的共识节号（共识·第X节），去重后按首次出现顺序返回 */
function consensusSections(text = docText()) {
  const seen = [];
  for (const m of text.matchAll(/共识·第([一二三四五六七八九十]+)节/g)) {
    if (!seen.includes(m[1])) seen.push(m[1]);
  }
  return seen;
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
  const order = zoneOrder(text);
  const pairs = wulunPairs(text);
  const a = quizAudit();

  console.log('眼科影像检查 · 第 1 章 对账');
  console.log('');
  console.log(`四区首见顺序：${order.join(' → ')}`);
  console.log(`五轮配属：${pairs.map((p) => `${p.zone}·${p.wheel}·${p.organ}`).join('；')}`);
  console.log(`两类信息的方向句（「推不出」）：${twoInfoDirections(text)} 处`);
  console.log(`闸门三件：${gates(text).map((g) => g.key).join(' → ')}`);
  console.log(`正文引到的共识节：${consensusSections(text).map((s) => `第${s}节`).join('、') || '（无）'}`);
  console.log('');
  console.log(`习题 ${a.total} 题（pre ${a.byStage.pre} / check ${a.byStage.check} / post ${a.byStage.post}）`);
  console.log(`check 题正确选项能在正文找到原词的：${a.grounded} 道`);
  console.log(a.problems.length ? `✗ ${a.problems.length} 处：${a.problems.join('；')}` : '✓ 结构齐、解释够长、判据落在正文');
  console.log('');
  console.log('※ 数字由本章正文与习题现算，不手打；正文改动后重跑即可复现。');
}

if (require.main === module) main();

module.exports = {
  ZONES,
  docText,
  quizData,
  hanzi,
  grams,
  zoneOrder,
  wulunPairs,
  twoInfoDirections,
  gates,
  consensusSections,
  quizAudit,
};
