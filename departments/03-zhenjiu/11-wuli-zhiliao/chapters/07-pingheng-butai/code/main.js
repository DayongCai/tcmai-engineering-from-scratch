#!/usr/bin/env node
/**
 * 物理治疗与运动康复 · 本章习题与正文自检
 * 课程: departments/03-zhenjiu/11-wuli-zhiliao/chapters/ 下本章目录（本文件所在 code/ 的上级）
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 输出四个数：正文字数、二级节数、习题分布、接地 check 题数。接地指该题正确选项里
 * 至少有一段 ≥6 个连续汉字真的出现在当章正文里 —— 习题必须与正文同源。
 * 任一项不达标即 exit 1；正文与习题才是本课的事实来源，本节只做计数与比对。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const MIN_DOC_HANZI = 2500;
const MIN_SECS = 4;
const MIN_QUESTIONS = 6;
const MIN_STAGE = { pre: 1, check: 3, post: 2 };
const MIN_EXPLAIN = 30;
const MIN_HIT = 6;

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const plain = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');

/** 正文里的 4 字连续汉字片段集合 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 正确选项在正文里能找到的最长连续汉字长度 */
function longestHit(option, docPlain) {
  const o = plain(option);
  for (let n = o.length; n >= 1; n -= 1) {
    for (let i = 0; i + n <= o.length; i += 1) {
      if (docPlain.includes(o.slice(i, i + n))) return n;
    }
  }
  return 0;
}

function load() {
  return {
    doc: fs.readFileSync(DOC, 'utf8'),
    quiz: JSON.parse(fs.readFileSync(QUIZ, 'utf8')),
  };
}

function analyze() {
  const { doc, quiz } = load();
  const m = doc.match(/^#\s*第\s*(\d+)\s*章\s*·\s*(.+?)\s*$/m);
  const body = shingles(doc);
  const docPlain = plain(doc);
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  const stages = { pre: 0, check: 0, post: 0 };
  const faults = [];
  let minExplain = Infinity;
  let grounded = 0;
  let checks = 0;

  questions.forEach((q, i) => {
    const n = i + 1;
    stages[q.stage] = (stages[q.stage] || 0) + 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4) faults.push(`第 ${n} 题不是 4 选项`);
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      faults.push(`第 ${n} 题 correct 下标非法`);
      return;
    }
    const why = q.explain || q.explanation || '';
    const whyHz = hz(why);
    if (whyHz < minExplain) minExplain = whyHz;
    if (q.stage === 'check') {
      checks += 1;
      const hit = longestHit(opts[q.correct], docPlain);
      const seen = [...shingles(opts[q.correct])].some((g) => body.has(g));
      if (!seen) faults.push(`第 ${n} 题（check）正确选项在正文里找不到原词`);
      if (hit < MIN_HIT) faults.push(`第 ${n} 题（check）最长原句只有 ${hit} 汉字（需 ≥${MIN_HIT}）`);
      if (seen) grounded += 1;
    }
  });

  const secs = (doc.match(/^## /gm) || []).length;
  const docHz = hz(doc);

  if (!m) faults.push('正文首行缺「# 第 N 章 · 标题」');
  if (docHz < MIN_DOC_HANZI) faults.push(`正文 ${docHz} 汉字（需 ≥${MIN_DOC_HANZI}）`);
  if (secs < MIN_SECS) faults.push(`二级节 ${secs} 个（需 ≥${MIN_SECS}）`);
  if (questions.length < MIN_QUESTIONS) faults.push(`习题 ${questions.length} 题（需 ≥${MIN_QUESTIONS}）`);
  for (const [s, min] of Object.entries(MIN_STAGE)) {
    if ((stages[s] || 0) < min) faults.push(`${s} 段 ${stages[s] || 0} 题（需 ≥${min}）`);
  }
  if (minExplain < MIN_EXPLAIN) faults.push(`最短解释 ${minExplain} 汉字（需 ≥${MIN_EXPLAIN}）`);
  if (grounded < 2) faults.push(`接地 check 题 ${grounded} 道（需 ≥2）`);

  return {
    chapter: m ? m[1] : '?',
    title: m ? m[2] : '（未读到标题）',
    docHanzi: docHz,
    secs,
    total: questions.length,
    stages,
    grounded,
    checks,
    minExplain: Number.isFinite(minExplain) ? minExplain : 0,
    faults,
    ok: faults.length === 0,
  };
}

function main() {
  const a = analyze();
  console.log(`第 ${a.chapter} 章 · ${a.title}`);
  console.log(`正文 ${a.docHanzi} 汉字 · 二级节 ${a.secs}`);
  console.log(`习题 ${a.total} 题 (pre ${a.stages.pre}/check ${a.stages.check}/post ${a.stages.post}) · 最短解释 ${a.minExplain} 汉字`);
  console.log(`接地 check 题 ${a.grounded}/${a.checks}（正确选项含 ≥${MIN_HIT} 汉字原句）`);
  if (!a.ok) {
    for (const f of a.faults) console.error('  - ' + f);
    console.error('自检未通过');
    process.exit(1);
  }
  console.log('自检通过：习题与正文同源。');
}

if (require.main === module) main();

module.exports = { CHAPTER: analyze().chapter, DOC, QUIZ, analyze, load, shingles, longestHit };
