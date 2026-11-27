#!/usr/bin/env node
/**
 * 针灸医籍选 · 第 6 章 歌赋用押韵换来了记得住，代价是把异文压成一个说法：正文与习题自检
 * 课程: departments/03-zhenjiu/03-zhenjiu-yiji-xuan/chapters/06-gefu
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读其他目录。
 *
 * 输出的三个数：正文字数、二级节数、习题接地数。接地数指 check 题的正确选项里
 * 至少有一个 ≥6 字的词组真的出现在当章正文里 —— 习题必须与正文同源，
 * 正文改了而习题没跟上，比习题少几道更糟。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const CH = '6';
const TITLE = '歌赋用押韵换来了记得住，代价是把异文压成一个说法';

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

/** 选项里是否有一段 ≥6 字的话原样出现在正文中（留 2 字余量，比 4 字核对更严） */
const body = shingles(String(doc).replace(/[^\u4e00-\u9fff]/g, ''), 6);
function quoted(s) {
  const clean = String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + 6 <= clean.length; i += 1) if (body.has(clean.slice(i, i + 6))) return clean.slice(i, i + 6);
  return '';
}

const stages = { pre: 0, check: 0, post: 0 };
for (const q of quiz.questions) stages[q.stage] = (stages[q.stage] || 0) + 1;

const problems = [];
if (quiz.questions.length !== 6) problems.push(`题数 ${quiz.questions.length}（应 6）`);
if (stages.pre !== 1) problems.push(`pre ${stages.pre}（应 1）`);
if (stages.check !== 3) problems.push(`check ${stages.check}（应 3）`);
if (stages.post !== 2) problems.push(`post ${stages.post}（应 2）`);

for (const q of quiz.questions) {
  const opts = Array.isArray(q.options) ? q.options : [];
  if (opts.length !== 4) problems.push('有题不是 4 选项');
  if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) problems.push('correct 下标非法');
  const n = hz(q.explain);
  if (n < 40 || n > 80) problems.push(`explain ${n} 汉字（应 40–80）`);
}

const checks = quiz.questions.filter((q) => q.stage === 'check');
const hits = checks.map((q) => quoted(q.options[q.correct]));
const hit = hits.filter(Boolean).length;
if (hit < checks.length) problems.push(`有 ${checks.length - hit} 道 check 题的正确选项在正文里找不到 ≥6 字原句`);

const minExplain = Math.min(...quiz.questions.map((q) => hz(q.explain)));
const maxExplain = Math.max(...quiz.questions.map((q) => hz(q.explain)));

console.log(`第 ${CH} 章 · ${TITLE}`);
console.log(`正文 ${hz(doc)} 汉字 · 二级节 ${secs}`);
console.log(`习题 ${quiz.questions.length} 题 (pre ${stages.pre}/check ${stages.check}/post ${stages.post}) · 解释 ${minExplain}–${maxExplain} 汉字`);
console.log(`接地 check 题 ${hit}/${checks.length}`);
checks.forEach((q, i) => console.log(`  ${i + 1}. ${hits[i] || '（未接地）'}`));

const ok = hz(doc) >= 2500 && secs >= 4 && problems.length === 0;
if (!ok) {
  for (const p of problems) console.error('✗ ' + p);
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
