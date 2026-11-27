#!/usr/bin/env node
/**
 * 康复医学基础 · 第 1 章 康复的目标是功能而不是治愈，判据必须落在活动上：正文与习题自检
 * 课程: departments/03-zhenjiu/09-kangfu-yixue-jichu/chapters/01-kangfu-gailun
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 输出：正文字数、二级节数、习题总数与阶段分布、接地数与最短解释。
 * 接地数指 check 题的正确选项里至少有一个 ≥4 字的词组真的出现在当章正文里 —— 习题必须与正文同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const CH = '1';
const TITLE = '康复的目标是功能而不是治愈，判据必须落在活动上';

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const secs = (doc.match(/^## /gm) || []).length;

/** 正文里的 4 字连续汉字片段集合 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body = shingles(doc);
const grounded = (s) => {
  const clean = String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + 4 <= clean.length; i += 1) if (body.has(clean.slice(i, i + 4))) return true;
  return false;
};

const stages = { pre: 0, check: 0, post: 0 };
for (const q of quiz.questions) stages[q.stage] = (stages[q.stage] || 0) + 1;

const checks = quiz.questions.filter((q) => q.stage === 'check');
const hit = checks.filter((q) => grounded(q.options[q.correct])).length;
const whys = quiz.questions.map((q) => hz(q.explanation || q.explain));
const minExplain = Math.min(...whys);
const maxExplain = Math.max(...whys);

console.log(`第 ${CH} 章 · ${TITLE}`);
console.log(`正文 ${hz(doc)} 汉字 · 二级节 ${secs}`);
console.log(`习题 ${quiz.questions.length} 题 (pre ${stages.pre}/check ${stages.check}/post ${stages.post}) · 最短解释 ${minExplain} 汉字`);
console.log(`接地 check 题 ${hit}/${checks.length}`);

const ok = hz(doc) >= 2500 && secs >= 4 && quiz.questions.length >= 6
  && stages.pre >= 1 && stages.check >= 3 && stages.post >= 2
  && hit >= checks.length && minExplain >= 40 && maxExplain <= 80;
if (!ok) {
  console.error('自检未通过');
  process.exit(1);
}

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
