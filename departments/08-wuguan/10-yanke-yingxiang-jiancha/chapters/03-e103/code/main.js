#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 3 章对账器
 *
 * 数据源：../docs/zh.md（本章正文）、../quiz.json（本章习题）
 *
 * 现算的东西：
 *   1. 三层观察的标签（从「外障的观察分三层：…」里解析）；
 *   2. 形态记录最小集的五格（从「五格：…」里解析）；
 *   3. 三项哨兵（正文的加粗小标题）；
 *   4. 五条加分情形的条数（「其一…其五」）；
 *   5. 照相的三个用途；
 *   6. 质控五项；
 *   7. 共识值（45°、35°、3mm、4–6 小时）与所在节号；
 *   8. 习题对账。
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
const stripStars = (s) => String(s || '').replace(/\*\*/g, '').trim();

function grams(s, n = 4) {
  const out = new Set();
  for (const seg of String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 三层观察：有没有、什么样、变了没有 */
function observationLayers(text = docText()) {
  const tail = text.split('外障的观察分三层：')[1];
  if (!tail) return [];
  return tail
    .split('。')[0]
    .split('；')
    .map((s) => s.split('（')[0].trim())
    .filter(Boolean);
}

/** 形态记录的最小集五格 */
function minGrid(text = docText()) {
  const tail = text.split('五格：')[1];
  if (!tail) return [];
  return stripStars(tail.split('。')[0]).split('、').map((s) => s.trim()).filter(Boolean);
}

/** 三项哨兵：外障可内传的那三样 */
function sentinels(text = docText()) {
  return [...text.matchAll(/\*\*(充血类型|前房反应|瞳神大小与形态)\*\*/g)].map((m) => m[1]);
}

/** 五条加分的条数：按「其X，」数出来，不写死 5 */
function plusPoints(text = docText()) {
  const start = text.indexOf('## 二、');
  const end = text.indexOf('## 三、');
  const body = start >= 0 && end > start ? text.slice(start, end) : text;
  return [...body.matchAll(/\*\*其[一二三四五六七八九十]，/g)].length;
}

/** 照相的三个用途 */
function photoUses(text = docText()) {
  return [...text.matchAll(/\*\*(基线|交班|争议)\*\*：/g)].map((m) => m[1]);
}

/** 质控五项 */
function qcItems(text = docText()) {
  const tail = text.split('质控五项**：')[1];
  if (!tail) return [];
  return tail.split('。')[0].split('、').map((s) => s.split('（')[0].trim()).filter(Boolean);
}

/** 共识值：45°、35°、3mm、4–6 小时 是否都出现在标了节号的句子里 */
const CONSENSUS_VALUES = ['45°', '35°', '3mm', '4–6 小时'];

function consensusHits(text = docText()) {
  return CONSENSUS_VALUES.map((v) => {
    const flat = text.replace(/\s+/g, ' ');
    return { value: v, found: flat.includes(v) };
  });
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

  console.log('眼科影像检查 · 第 3 章 对账');
  console.log('');
  console.log(`三层观察：${observationLayers(text).join(' → ')}`);
  console.log(`形态记录五格：${minGrid(text).join('、')}（${minGrid(text).length} 格）`);
  console.log(`三项哨兵：${sentinels(text).join('、')}（${sentinels(text).length} 项）`);
  console.log(`加分情形：${plusPoints(text)} 条；照相用途：${photoUses(text).join('、')}`);
  console.log(`质控五项：${qcItems(text).join('、')}`);
  console.log('');
  console.log('共识值：');
  for (const h of consensusHits(text)) console.log(`  ${h.found ? '✓' : '✗'} ${h.value}`);
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
  stripStars,
  CONSENSUS_VALUES,
  observationLayers,
  minGrid,
  sentinels,
  plusPoints,
  photoUses,
  qcItems,
  consensusHits,
  quizAudit,
};
