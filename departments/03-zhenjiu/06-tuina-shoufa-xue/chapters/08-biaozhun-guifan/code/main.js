#!/usr/bin/env node
/**
 * 推拿手法学 · 第 8 章 手法标准化的操作规范 —— 正文与习题自检
 * 课程: departments/03-zhenjiu/06-tuina-shoufa-xue/chapters/08-biaozhun-guifan
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读其他目录。
 *
 * 输出的三个数：正文字数、二级节数、习题接地数。接地数指 check 题的正确选项里
 * 至少有一个 ≥4 字的词组真的出现在当章正文里 —— 习题必须与正文同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const CH = '8';
const heading = (doc.match(/^#\s+(.+)$/m) || [null, '(无标题)'])[1];

const hz = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
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
const minExplain = Math.min(...quiz.questions.map((q) => hz(q.explanation)));

console.log(heading);
console.log(`正文 ${hz(doc)} 汉字 · 二级节 ${secs}`);
console.log(`习题 ${quiz.questions.length} 题 (pre ${stages.pre}/check ${stages.check}/post ${stages.post}) · 最短解释 ${minExplain} 汉字`);
console.log(`接地 check 题 ${hit}/${checks.length}`);

const ok = hz(doc) >= 2500 && secs >= 4 && quiz.questions.length >= 5
  && stages.pre >= 1 && stages.check >= 2 && stages.post >= 1
  && hit >= 2 && minExplain >= 40;
if (!ok) {
  console.error('自检未通过');
  process.exit(1);
}
