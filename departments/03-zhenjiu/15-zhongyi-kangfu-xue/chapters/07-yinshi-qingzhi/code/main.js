#!/usr/bin/env node
/**
 * 中医康复学 · 第 7 章 饮食与情志康复的处方开在饭桌和床头，不在药罐里：正文与习题自检
 * 课程: departments/03-zhenjiu/15-zhongyi-kangfu-xue/chapters/07-yinshi-qingzhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 输出的三个数：正文字数、二级节数、习题接地数。接地数指 check 题的正确选项里
 * 至少有一个 ≥6 字的词组真的出现在当章正文里 —— 习题必须与正文同源。
 * 任一判据不达标即以退出码 1 结束。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const CH = '7';
const TITLE = '饮食与情志康复的处方开在饭桌和床头，不在药罐里';
const MIN_HANZI = 2500;
const MIN_SECS = 4;

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hz = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const secs = (doc.match(/^## /gm) || []).length;

/** 正文里的 n 字连续汉字片段集合 */
function shingles(text, n) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body4 = shingles(doc, 4);
const body6 = shingles(doc, 6);
const grounded4 = (s) => {
  const clean = String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + 4 <= clean.length; i += 1) if (body4.has(clean.slice(i, i + 4))) return true;
  return false;
};
const grounded6 = (s) => {
  const clean = String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + 6 <= clean.length; i += 1) if (body6.has(clean.slice(i, i + 6))) return true;
  return false;
};

const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
const why = (q) => q.explain || q.explanation || '';
const stages = { pre: 0, check: 0, post: 0 };
for (const q of qs) stages[q.stage] = (stages[q.stage] || 0) + 1;

const checks = qs.filter((q) => q.stage === 'check');
const hit4 = checks.filter((q) => grounded4(q.options[q.correct])).length;
const hit6 = checks.filter((q) => grounded6(q.options[q.correct])).length;
const short = qs.filter((q) => hz(why(q)) < 40).length;
const long = qs.filter((q) => hz(why(q)) > 80).length;
const shortOpt = qs.filter((q) => !Array.isArray(q.options) || q.options.length !== 4).length;
const badIdx = qs.filter((q) => !(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < (q.options || []).length)).length;
const minExplain = Math.min(...qs.map((q) => hz(why(q))));
const maxExplain = Math.max(...qs.map((q) => hz(why(q))));

console.log(`第 ${CH} 章 · ${TITLE}`);
console.log(`正文 ${hz(doc)} 汉字 · 二级节 ${secs}`);
console.log(`习题 ${qs.length} 题 (pre ${stages.pre}/check ${stages.check}/post ${stages.post}) · 解释 ${minExplain}–${maxExplain} 汉字`);
console.log(`接地 check 题 ${hit4}/${checks.length}（4 字词组）· ${hit6}/${checks.length}（6 字原句）`);

const fails = [];
if (hz(doc) < MIN_HANZI) fails.push(`正文 ${hz(doc)} 汉字，需 ≥ ${MIN_HANZI}`);
if (secs < MIN_SECS) fails.push(`二级节 ${secs}，需 ≥ ${MIN_SECS}`);
if (qs.length < 6) fails.push(`习题 ${qs.length} 题，需 6 题`);
if (stages.pre < 1) fails.push('缺 pre 题');
if (stages.check < 3) fails.push('check 题需 3 道');
if (stages.post < 2) fails.push('post 题需 2 道');
if (shortOpt) fails.push(`${shortOpt} 题不是 4 选项`);
if (badIdx) fails.push(`${badIdx} 题 correct 下标非法`);
if (short) fails.push(`${short} 题解释不足 40 汉字`);
if (long) fails.push(`${long} 题解释超过 80 汉字`);
if (hit4 < 3) fails.push(`接地 check 题 ${hit4}，需 ≥ 3`);
if (hit6 < 2) fails.push(`6 字原句接地只有 ${hit6} 道，需 ≥ 2`);

if (fails.length) {
  console.error('自检未通过：');
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('自检通过：习题与正文同源。');
