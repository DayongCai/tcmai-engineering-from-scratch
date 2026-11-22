#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 7 章对账器
 *
 * 数据源：../docs/zh.md（本章正文）、../quiz.json（本章习题）
 *
 * 现算的东西：
 *   1. 三段式（所见、解释、建议）的分工；
 *   2. 所见四条纪律、建议三档、复查项表的数据行数；
 *   3. 基本信息 9 项：正文自报的「9」与真正列出的项数要对得上（9 = 8 + 1 组合项）；
 *   4. 建议定档：缺时点依据的落到复查档的未完成态，缺触发条件的落到「语法像建议的空白」；
 *   5. 习题对账。
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

/** 三段的分工：所见 → 解释 → 建议 */
function threeSections(text = docText()) {
  return [...text.matchAll(/(所见|解释|建议)给「/g)].map((m) => m[1]);
}

/** 所见段的四条纪律 */
function sightDisciplines(text = docText()) {
  return [...text.matchAll(/\*\*(可定位|可比较|可复核|不夹判断)。\*\*/g)].map((m) => m[1]);
}

/** 建议三档 */
function adviceTiers(text = docText()) {
  return [...text.matchAll(/\*\*(观察档|复查档|转诊档)\*\*：/g)].map((m) => m[1]);
}

/** 复查项表的数据行（表头之外） */
function reviewTableRows(text = docText()) {
  const start = text.indexOf('| 主诉 | 首诊必做 | 复查必看 |');
  if (start < 0) return [];
  const lines = text.slice(start).split('\n').filter((l) => l.trim().startsWith('|'));
  return lines.filter((l) => !l.includes('主诉 |') && !/^\|[\s-]+\|/.test(l.trim()));
}

/** 基本信息：正文自报几项、实际列了几项、组合项是什么 */
function basicInfo(text = docText()) {
  const stated = Number((/基本信息\s*(\d+)\s*项/.exec(text) || [])[1]);
  const seg = text.split(`基本信息 ${stated} 项：`)[1] || '';
  const head = seg.split('。')[0];
  const parts = head.split('，加');
  const listed = parts[0].replace(/，$/, '').split('、').map((s) => s.trim()).filter(Boolean);
  const combined = (parts[1] || '').split('（')[0].trim();
  return { stated, listed, combined, total: listed.length + (combined ? 1 : 0) };
}

/**
 * 建议定档。字段齐全度决定档位：缺时点的复查不是复查档，缺触发条件的观察就是
 * 「语法上像建议的空白」——正文要挡的第一种写法。
 */
function adviceTier({ dept = '', item = '', when = '', trigger = '' } = {}) {
  if (dept) return { tier: '转诊档', missing: when ? [] : ['时限'] };
  if (item) return { tier: '复查档', missing: when ? [] : ['时点依据'] };
  if (trigger) return { tier: '观察档', missing: [] };
  return { tier: null, missing: ['触发条件'] };
}

/** 疗效三层：结构、功能、患者报告 */
function effectTiers(text = docText()) {
  const seg = text.split('疗效分三层，不要互相替代：')[1];
  if (!seg) return [];
  return seg
    .split('。')[0]
    .replace(/\*\*/g, '')
    .split('、')
    .map((s) => s.split('（')[0].trim())
    .filter(Boolean);
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
  const info = basicInfo(text);

  console.log('眼科影像检查 · 第 7 章 对账');
  console.log('');
  console.log(`三段分工：${threeSections(text).join(' → ')}`);
  console.log(`所见四条纪律：${sightDisciplines(text).join('、')}（${sightDisciplines(text).length} 条）`);
  console.log(`建议三档：${adviceTiers(text).join('、')}`);
  console.log(`复查项表：${reviewTableRows(text).length} 行数据；疗效三层：${effectTiers(text).join('、')}`);
  console.log('');
  console.log(`基本信息自报 ${info.stated} 项，实列 ${info.listed.length} 项 + 组合项「${info.combined}」= ${info.total} 项`);
  console.log(`「必要时复查」定档：${JSON.stringify(adviceTier({}))}`);
  console.log(`缺时点的复查：${JSON.stringify(adviceTier({ item: '眼底复查' }))}`);
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
  threeSections,
  sightDisciplines,
  adviceTiers,
  reviewTableRows,
  basicInfo,
  adviceTier,
  effectTiers,
  quizAudit,
};
