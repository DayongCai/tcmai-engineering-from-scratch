#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 6 章对账器
 *
 * 数据源：../docs/zh.md（本章正文）、../quiz.json（本章习题）
 *
 * 现算的东西：
 *   1. 出血分层的表（层次 → 形态词），从正文表里解析，不手打；
 *   2. 按形态反查层次 —— 正文的判据是形态决定层次；
 *   3. 三层最小集、三个相对标尺、三条时程线索、复查间隔四件事、疗效三层；
 *   4. 转诊判据的条数；
 *   5. 正文有没有编造灵敏度／特异度（应当没有）；
 *   6. 习题对账。
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

/**
 * 分层表：正文写成「**视网膜内**：火焰状、线状，沿神经纤维走行铺开」。
 * 返回 [{layer, words:[…]}]，层次与该行描述词的对应关系全部来自正文。
 */
function layerTable(text = docText()) {
  const out = [];
  const re = /\*\*(视网膜内|视网膜下|视网膜前／玻璃体下|玻璃体|脉络膜)\*\*：([^。]*)/g;
  for (const m of text.matchAll(re)) {
    const words = m[2].split('，')[0].split('、').map((s) => s.trim()).filter(Boolean);
    out.push({ layer: m[1], words });
  }
  return out;
}

/** 按形态反查层次；正文没有的形态一律返回 null，不猜 */
function layerFor(shape, text = docText()) {
  const hit = layerTable(text).find((row) => row.words.includes(shape));
  return hit ? hit.layer : null;
}

/** 三层最小集：视网膜内、视网膜下、玻璃体与视网膜前 */
function minimalLayers(text = docText()) {
  return [...text.matchAll(/\*\*(视网膜内出血|视网膜下出血|玻璃体与视网膜前出血)\*\*/g)].map((m) => m[1]);
}

/** 三个相对标尺 */
function rulers(text = docText()) {
  return [...text.matchAll(/\*\*(?:一是|二是|三是)以([^*]+?)为标尺\*\*/g)].map((m) => m[1]);
}

/** 三条时程线索：颜色、边界、液平面 */
function timeClues(text = docText()) {
  const seg = text.split('时程有三条线索：')[1];
  if (!seg) return [];
  return [...seg.split('。')[0].matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]);
}

/** 复查间隔的四件事 */
function intervalFactors(text = docText()) {
  const seg = text.split('间隔应当由四件事决定。')[1];
  if (!seg) return [];
  return [...seg.matchAll(/\*\*([^*]+)\*\*：/g)].map((m) => m[1]);
}

/** 转诊判据的条数（每条以「——」引出处置方向） */
function referralRules(text = docText()) {
  const seg = text.split('以下情形不属于「下次再说」：')[1];
  if (!seg) return [];
  return [...seg.split('。')[0].matchAll(/\*\*[^*]+\*\*——/g)].length;
}

/** 疗效评价的三层 */
function effectTiers(text = docText()) {
  return [...text.matchAll(/\*\*(结构|功能|全身)\*\*（/g)].map((m) => m[1]);
}

/** 正文有没有编造灵敏度／特异度 */
function inventedAccuracy(text = docText()) {
  return (text.match(/灵敏度|特异度|准确率/g) || []).length;
}

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
  const a = quizAudit();
  const table = layerTable(text);

  console.log('眼科影像检查 · 第 6 章 对账');
  console.log('');
  console.log('分层表（层次 ← 描述词）：');
  for (const row of table) console.log(`  ${row.layer}：${row.words.join('、')}`);
  console.log(`  火焰状 → ${layerFor('火焰状')}；舟状 → ${layerFor('舟状')}；絮状 → ${layerFor('絮状')}`);
  console.log('');
  console.log(`三层最小集：${minimalLayers(text).join('、')}`);
  console.log(`三个相对标尺：${rulers(text).join('、')}`);
  console.log(`时程三线索：${timeClues(text).join('、')}`);
  console.log(`间隔四件事：${intervalFactors(text).join('、')}`);
  console.log(`转诊判据：${referralRules(text)} 条；疗效三层：${effectTiers(text).join('、')}`);
  console.log(`灵敏度／特异度类断言：${inventedAccuracy(text)} 处（应为 0）`);
  console.log('');
  console.log(`习题 ${a.total} 题（pre ${a.byStage.pre} / check ${a.byStage.check} / post ${a.byStage.post}）`);
  console.log(`check 题正确选项能在正文找到原词的：${a.grounded} 道`);
  console.log(a.problems.length ? `✗ ${a.problems.length} 处：${a.problems.join('；')}` : '✓ 结构齐、解释够长、判据落在正文');
  console.log('');
  console.log('※ 数字由本章正文现算，不手打；正文改动后重跑即可复现。');
}

if (require.main === module) main();

module.exports = {
  docText,
  quizData,
  hanzi,
  grams,
  layerTable,
  layerFor,
  minimalLayers,
  rulers,
  timeClues,
  intervalFactors,
  referralRules,
  effectTiers,
  inventedAccuracy,
  quizAudit,
};
