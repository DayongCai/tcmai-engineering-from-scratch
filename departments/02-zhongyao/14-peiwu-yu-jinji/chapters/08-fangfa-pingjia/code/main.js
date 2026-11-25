#!/usr/bin/env node
/**
 * 中药配伍与禁忌 · 第 8 章 配伍证据的强弱由设计决定，不由成分数量决定：正文与习题自检
 * 课程: departments/02-zhongyao/14-peiwu-yu-jinji/chapters/08-fangfa-pingjia/docs/zh.md
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json。
 *
 * 数全部现算：正文字数、二级节数、表格数、名目出现次数、
 * 习题的阶段分布与接地数。接地数指 check 题的正确选项里至少有一个 ≥4 字的词组
 * 真的出现在当章正文里 —— 习题必须与正文同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const CH = '8';
const TITLE = '配伍证据的强弱由设计决定，不由成分数量决定';
/** 本章要复算的名目 */
const NAMES = ["物质","效应","临床","验证"];

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const questions = Array.isArray(quiz) ? quiz : quiz.questions || [];

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const secs = () => (doc.match(/^## /gm) || []).length;
const tables = () => (doc.match(/^\|[-\s|:]+\|$/gm) || []).length;

/** 正文里 4 字连续汉字片段集合 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body = shingles(doc);

/** 选项里的任意 ≥4 字词组是否出现在正文 */
function grounded(opt) {
  const clean = String(opt || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + 4 <= clean.length; i += 1) if (body.has(clean.slice(i, i + 4))) return true;
  return false;
}

const why = (q) => q.explain || q.explanation || '';
const stageOf = (q) => q.stage || q.phase;

/** 名目在正文里的出现次数 */
function nameCounts() {
  const out = {};
  for (const n of NAMES) out[n] = (doc.match(new RegExp(n, 'g')) || []).length;
  return out;
}

function report() {
  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of questions) stages[stageOf(q)] = (stages[stageOf(q)] || 0) + 1;
  const checks = questions.filter((q) => stageOf(q) === 'check');
  const hit = checks.filter((q) => grounded(q.options && q.options[q.correct])).length;
  const minExplain = Math.min(...questions.map((q) => hz(why(q))));
  return {
    hanzi: hz(doc),
    sections: secs(),
    tables: tables(),
    names: nameCounts(),
    questions: questions.length,
    stages,
    checks: checks.length,
    grounded: hit,
    minExplain,
  };
}

function checksPass(r) {
  const problems = [];
  if (r.hanzi < 2800 || r.hanzi > 3400) problems.push(`正文字数 ${r.hanzi} 不在 2800–3400`);
  if (r.sections < 4) problems.push(`二级节只有 ${r.sections}`);
  if (r.tables < 0) problems.push(`表格只有 ${r.tables} 张`);
  if (r.questions < 5) problems.push(`习题只有 ${r.questions} 题`);
  for (const s of ['pre', 'check', 'post']) if (!r.stages[s]) problems.push(`缺 ${s} 阶段`);
  if (r.stages.check < 3) problems.push(`check 题只有 ${r.stages.check}`);
  if (r.grounded < 2) problems.push(`接地 check 题只有 ${r.grounded}`);
  if (r.minExplain < 30) problems.push(`最短解释 ${r.minExplain} 汉字`);
  for (const n of NAMES) if (!r.names[n]) problems.push(`正文缺名目「${n}」`);
  for (const [i, q] of questions.entries()) {
    const opts = q.options || [];
    if (opts.length !== 4) problems.push(`第 ${i + 1} 题不是 4 选项`);
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      problems.push(`第 ${i + 1} 题 correct 下标非法`);
    }
  }
  return problems;
}

function main() {
  const r = report();
  console.log(`第 ${CH} 章 · ${TITLE}`);
  console.log(`正文 ${r.hanzi} 汉字 · 二级节 ${r.sections} · 表格 ${r.tables}`);
  console.log(`名目出现次数：${NAMES.map((n) => `${n} ${r.names[n]}`).join('、')}`);
  console.log(
    `习题 ${r.questions} 题（pre ${r.stages.pre}／check ${r.stages.check}／post ${r.stages.post}）· 最短解释 ${r.minExplain} 汉字`
  );
  console.log(`接地 check 题 ${r.grounded}/${r.checks}`);
  const problems = checksPass(r);
  if (problems.length) {
    console.error('自检未通过：');
    for (const p of problems) console.error('  - ' + p);
    process.exitCode = 1;
    return;
  }
  console.log('※ 以上数字由本脚本从 docs/zh.md 与 quiz.json 现算，改字后重跑即可复现；教学样例，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { report, checksPass, grounded, shingles, NAMES, CH, TITLE };
