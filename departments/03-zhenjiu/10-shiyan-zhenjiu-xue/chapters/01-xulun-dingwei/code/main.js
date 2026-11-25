#!/usr/bin/env node
/**
 * 实验针灸学 · 第 1 章 实验针灸学的分水岭不是技术，而是敢不敢把结论降级：正文与习题自检
 * 课程: departments/03-zhenjiu/10-shiyan-zhenjiu-xue/chapters/01-xulun-dingwei
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 输出的三个数：正文字数、二级节数、习题接地数。接地数指 check 题的正确选项里
 * 至少有一个 ≥6 字的词组真的出现在当章正文里 —— 习题必须与正文同源。
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
const TITLE = '实验针灸学的分水岭不是技术，而是敢不敢把结论降级';

const hz = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
const secs = (doc.match(/^## /gm) || []).length;

/** 正文里的连续汉字片段集合 */
function shingles(text, n) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body = shingles(doc, 6);
const grounded = (s) => {
  const clean = String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + 6 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 6))) return true;
  }
  return false;
};

const stages = { pre: 0, check: 0, post: 0 };
for (const q of quiz.questions) stages[q.stage] = (stages[q.stage] || 0) + 1;

const checks = quiz.questions.filter((q) => q.stage === 'check');
const hit = checks.filter((q) => grounded(q.options[q.correct])).length;
const why = quiz.questions.map((q) => q.explain ?? q.explanation ?? '');
const shortWhy = Math.min(...why.map(hz));
const longWhy = Math.max(...why.map(hz));
const optsOk = quiz.questions.every((q) => Array.isArray(q.options) && q.options.length === 4
  && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);

console.log(`第 ${CH} 章 · ${TITLE}`);
console.log(`正文 ${hz(doc)} 汉字 · 二级节 ${secs}`);
console.log(`习题 ${quiz.questions.length} 题 (pre ${stages.pre}/check ${stages.check}/post ${stages.post}) · 解释 ${shortWhy}–${longWhy} 汉字`);
console.log(`接地 check 题 ${hit}/${checks.length}（正确选项含 ≥6 字正文原句）`);

const ok = hz(doc) >= 2500 && secs >= 4 && quiz.questions.length >= 6
  && stages.pre >= 1 && stages.check >= 3 && stages.post >= 2
  && hit === checks.length && hit >= 3
  && shortWhy >= 40 && longWhy <= 80 && optsOk;
if (!ok) {
  console.error('自检未通过：正文规模、题型配比、解释长度或接地数不达标');
  process.exit(1);
}
