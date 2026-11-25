#!/usr/bin/env node
/**
 * 耳穴诊治学 · 第 3 章 正文与习题自检
 * 课程: departments/03-zhenjiu/12-erxue-zhenduan-xue/chapters/03-dingwei/docs/zh.md
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 输出的四个数：正文字数、二级节数、题量与最短解释、习题接地数。接地数指 check 题的
 * 正确选项里至少有一个 >=6 汉字的词组真的出现在当章正文里 —— 习题必须与正文同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const CH = '3';
const TITLE = ((doc.match(/^#[^\n]*/m) || [''])[0])
  .replace(/^#\s*/, '')
  .replace(/^第\s*\d+\s*章\s*·\s*/, '')
  .trim();

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const secs = (text) => (String(text || '').match(/^## /gm) || []).length;

/** 正文里的 n 字连续汉字片段集合 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 接地判据：正确选项里的连续汉字长度 */
const N = 6;
const BODY = shingles(doc, N);

function grounded(option) {
  const clean = String(option || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + N <= seg.length; i += 1) if (BODY.has(seg.slice(i, i + N))) return true;
  }
  return false;
}

const why = (q) => q.explain || q.explanation || '';

function audit() {
  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of quiz.questions) stages[q.stage] = (stages[q.stage] || 0) + 1;
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  return {
    hanzi: hz(doc),
    secs: secs(doc),
    total: quiz.questions.length,
    stages,
    checkCount: checks.length,
    hit: checks.filter((q) => grounded(q.options[q.correct])).length,
    minExplain: Math.min(...quiz.questions.map((q) => hz(why(q)))),
    maxExplain: Math.max(...quiz.questions.map((q) => hz(why(q)))),
  };
}

function main() {
  const a = audit();
  console.log('第 ' + CH + ' 章 · ' + TITLE);
  console.log('正文 ' + a.hanzi + ' 汉字 · 二级节 ' + a.secs);
  console.log('习题 ' + a.total + ' 题 (pre ' + a.stages.pre + '/check ' + a.stages.check + '/post ' + a.stages.post + ')'
    + ' · 解释 ' + a.minExplain + '-' + a.maxExplain + ' 汉字');
  console.log('接地 check 题 ' + a.hit + '/' + a.checkCount);

  const ok = a.hanzi >= 2500 && a.secs >= 4 && a.total >= 6
    && a.stages.pre >= 1 && a.stages.check >= 3 && a.stages.post >= 2
    && a.hit >= 3 && a.minExplain >= 40 && a.maxExplain <= 80;
  if (!ok) {
    console.error('自检未通过');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { CH, TITLE, DOC, QUIZ, doc, quiz, hz, secs, shingles, grounded, why, audit };
