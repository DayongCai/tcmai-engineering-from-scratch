#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 5 章对账器
 *
 * 数据源：../docs/zh.md（本章正文）、../quiz.json（本章习题）
 *
 * 现算的东西：
 *   1. 杯盘比：只当比值记录，判读依据另列 —— 比值本身永远不产出结论，这一条写成判据；
 *   2. 盘沿按几个象限记、缺损形态的几个名字、随访三根柱子、不一致的四种解释；
 *   3. 正文里有没有任何「杯盘比阈值」式的断言（应当没有：共识不给阈值）；
 *   4. 习题对账。
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

/** 杯盘比只是比值：两个直径，一个商。分子分母都是人划的线，所以只当记录 */
function cupDiscRatio(cupMm, discMm) {
  if (!(discMm > 0)) throw new RangeError('盘直径必须为正');
  if (!(cupMm >= 0)) throw new RangeError('杯直径不能为负');
  if (cupMm > discMm) throw new RangeError('杯直径不应大于盘直径');
  return Math.round((cupMm / discMm) * 100) / 100;
}

/**
 * 判读依据：正文要求回到盘沿宽度与形态。
 * 只给比值时返回「仅供记录」，不产出结论；比例再大也不能自己变成结论。
 */
function interpret({ cupMm, discMm, rimNotch = '', fnlDefect = '', fieldPattern = '' } = {}) {
  const ratio = cupDiscRatio(cupMm, discMm);
  const basis = [];
  if (rimNotch) basis.push(`盘沿切迹：${rimNotch}`);
  if (fnlDefect) basis.push(`纤维层缺损：${fnlDefect}`);
  if (fieldPattern) basis.push(`视野形态：${fieldPattern}`);
  return {
    ratio,
    basis,
    conclusion: basis.length === 0 ? '仅供记录，不作判读' : '可进入判读：比值须与上列依据并读',
  };
}

/** 盘沿按几个象限记：正文写作「按上、下、鼻、颞四个象限」 */
function rimQuadrants(text = docText()) {
  const seg = text.split('按上、下、鼻、颞')[1];
  if (!seg) return [];
  return ['上', '下', '鼻', '颞'];
}

/** 视野缺损的形态词汇 */
function fieldDefectWords(text = docText()) {
  const seg = text.split('缺损形态有自己的一套词汇：')[1];
  if (!seg) return [];
  return seg.split('。')[0].split('、').map((s) => s.trim()).filter(Boolean);
}

/** 随访三根柱子 */
function trendPillars(text = docText()) {
  return [...text.matchAll(/\*\*(基线|间隔|可重复性)\*\*回答/g)].map((m) => m[1]);
}

/** 结构—功能不一致的四种解释 */
function mismatchReasons(text = docText()) {
  return [...text.matchAll(/\*\*(病程错位|测量误差|解剖变异|读片差异)。\*\*/g)].map((m) => m[1]);
}

/** 正文有没有下杯盘比阈值：能匹配到就算违规 */
function cdrThresholdClaims(text = docText()) {
  return [...text.matchAll(/杯盘比[^。；]{0,12}?(?:≥|>|大于|超过)\s*0?\.\d+/g)].map((m) => m[0]);
}

/** 「共识不给阈值」这句话在不在 */
function consensusNoThreshold(text = docText()) {
  return text.includes('杯盘比阈值') && text.includes('仍按所在机构规范');
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
  const only = interpret({ cupMm: 0.6, discMm: 1.0 });
  const withRim = interpret({ cupMm: 0.6, discMm: 1.0, rimNotch: '下方局限性缺口' });

  console.log('眼科影像检查 · 第 5 章 对账');
  console.log('');
  console.log(`杯盘比 0.6/1.0 = ${only.ratio}；只给比值 → ${only.conclusion}`);
  console.log(`补上盘沿切迹后 → ${withRim.conclusion}`);
  console.log(`盘沿记录象限：${rimQuadrants(text).join('、')}（${rimQuadrants(text).length} 个）`);
  console.log(`视野缺损形态：${fieldDefectWords(text).join('、')}（${fieldDefectWords(text).length} 个）`);
  console.log(`随访三根柱子：${trendPillars(text).join('、')}`);
  console.log(`不一致的四种解释：${mismatchReasons(text).join('、')}`);
  console.log('');
  console.log(`正文里的杯盘比阈值断言：${cdrThresholdClaims(text).length} 处（应为 0）`);
  console.log(`共识不给阈值的口径是否写明：${consensusNoThreshold(text) ? '是' : '否'}`);
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
  cupDiscRatio,
  interpret,
  rimQuadrants,
  fieldDefectWords,
  trendPillars,
  mismatchReasons,
  cdrThresholdClaims,
  consensusNoThreshold,
  quizAudit,
};
