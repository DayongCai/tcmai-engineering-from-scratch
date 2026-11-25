#!/usr/bin/env node
/**
 * 针灸学 · 第 28 章 五官科病证：局部开窍加远端引经：正文与习题自检
 * 课程: departments/03-zhenjiu/16-zhenjiu-xue/chapters/28-wuguan-bingzheng
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 五病共用一条路径，四十一处引文却只有一个篇名；按语为零说明教材在这一章不下判断。
 *
 * 判据（任一不满足即 exit 1）：
 *   正文 ≥ 2500 汉字、二级节 ≥ 3；习题 6 题（pre 1 / check 3 / post 2）；
 *   每题 4 个选项、correct 为合法下标；explain 40～80 汉字；
 *   3 道 check 题的正确选项里都有一段 ≥6 汉字的话在本章正文中原样出现。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const CH = '28';
const TITLE = '五官科病证：局部开窍加远端引经';
const KEYS = ["引文","按语","风池"];

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
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

const body6 = shingles(doc, 6);

/** 正确选项里是否有一段 ≥6 汉字的话真的出现在正文里 */
function grounded(s) {
  const clean = String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + 6 <= clean.length; i += 1) if (body6.has(clean.slice(i, i + 6))) return true;
  return false;
}

const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
const stages = { pre: 0, check: 0, post: 0 };
const problems = [];
for (const q of qs) stages[q.stage] = (stages[q.stage] || 0) + 1;

if (hz(doc) < 2500) problems.push('正文只有 ' + hz(doc) + ' 汉字（需 ≥2500）');
if (secs < 3) problems.push('二级节只有 ' + secs + ' 节（需 ≥3）');
if (qs.length !== 6) problems.push('习题 ' + qs.length + ' 题（需 6）');
if (stages.pre !== 1 || stages.check !== 3 || stages.post !== 2) {
  problems.push('题段分布 pre ' + stages.pre + ' / check ' + stages.check + ' / post ' + stages.post + '（需 1/3/2）');
}
for (const q of qs) {
  const opts = Array.isArray(q.options) ? q.options : [];
  if (opts.length !== 4) problems.push('有题不是 4 选项：' + q.question);
  if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
    problems.push('correct 下标非法：' + q.question);
  }
  const n = hz(q.explain || q.explanation);
  if (n < 40 || n > 80) problems.push('explain ' + n + ' 汉字（需 40～80）：' + q.question);
}
for (const k of KEYS) if (!doc.includes(k)) problems.push('正文缺少关键词：' + k);

const checks = qs.filter((q) => q.stage === 'check');
const hit = checks.filter((q) => grounded(q.options[q.correct])).length;
if (hit !== 3) problems.push('接地的 check 题 ' + hit + ' 道（需 3）');

const minExplain = qs.length ? Math.min(...qs.map((q) => hz(q.explain || q.explanation))) : 0;
const maxExplain = qs.length ? Math.max(...qs.map((q) => hz(q.explain || q.explanation))) : 0;

console.log('第 ' + CH + ' 章 · ' + TITLE);
console.log('正文 ' + hz(doc) + ' 汉字 · 二级节 ' + secs);
console.log('习题 ' + qs.length + ' 题（pre ' + stages.pre + ' / check ' + stages.check + ' / post ' + stages.post + '）· explain ' + minExplain + '～' + maxExplain + ' 汉字');
console.log('接地 check 题 ' + hit + '/' + checks.length + ' · 关键词 ' + KEYS.join('、'));
if (problems.length) {
  console.error('自检未通过：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('自检通过：习题与正文同源。');
