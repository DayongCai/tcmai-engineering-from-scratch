#!/usr/bin/env node
/**
 * 药用植物学 · 第 2 章 把显微镜下的空腔读成层序、细胞与内容物：正文与习题自检
 * 课程: departments/02-zhongyao/02-yaoyong-zhiwu-xue/chapters/02-xibao-zuzhi
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，所有数字现算。
 *
 * 打印正文字数、二级节数、题数与 pre/check/post 分布、接地 check 题数、
 * 最短解释字数、答案位置分布。接地指 check 题的正确选项里有一个 4 字词组
 * 真的出现在当章正文里 —— 习题必须与正文同源。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CH = 2;
const TITLE = '把显微镜下的空腔读成层序、细胞与内容物';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const hz = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 正文里的 4 字连续汉字片段集合 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 现读正文与 quiz，逐项算 */
function stats() {
  const docText = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of questions) stages[q.stage] = (stages[q.stage] || 0) + 1;

  const body = shingles(docText);
  const grounded = (s) => {
    const clean = String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
    for (let i = 0; i + 4 <= clean.length; i += 1) if (body.has(clean.slice(i, i + 4))) return true;
    return false;
  };

  const checks = questions.filter((q) => q.stage === 'check');
  const groundedChecks = checks.filter((q) => grounded((q.options || [])[q.correct])).length;
  const explains = questions.map((q) => hz(q.explain || q.explanation));
  const answers = questions.map((q) => q.correct);

  let longestRun = answers.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < answers.length; i += 1) {
    if (answers[i] === answers[i - 1]) { run += 1; longestRun = Math.max(longestRun, run); } else { run = 1; }
  }

  return {
    chapter: CH,
    title: TITLE,
    hanzi: hz(docText),
    sections: (docText.match(/^## /gm) || []).length,
    questions: questions.length,
    stages,
    checks: checks.length,
    groundedChecks,
    minExplain: explains.length ? Math.min(...explains) : 0,
    answers,
    distinctAnswers: new Set(answers).size,
    longestRun,
    wellFormed: questions.every((q) => Array.isArray(q.options) && q.options.length === 4
      && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4)
  };
}

function report(s) {
  const { pre, check, post } = s.stages;
  console.log('第 ' + s.chapter + ' 章 · ' + s.title);
  console.log('正文 ' + s.hanzi + ' 汉字 · 二级节 ' + s.sections);
  console.log('习题 ' + s.questions + ' 题 (pre ' + pre + '/check ' + check + '/post ' + post + ') · 最短解释 ' + s.minExplain + ' 汉字');
  console.log('接地 check 题 ' + s.groundedChecks + '/' + s.checks);
  console.log('答案位置 ' + s.distinctAnswers + ' 种 · 最长同位连排 ' + s.longestRun);
}

function ok(s) {
  return s.hanzi >= 2800 && s.hanzi <= 3400
    && s.sections >= 4
    && s.questions >= 5
    && s.stages.pre >= 1 && s.stages.check >= 2 && s.stages.post >= 1
    && s.groundedChecks >= 2
    && s.minExplain >= 30
    && s.distinctAnswers >= 3
    && s.longestRun <= 2
    && s.wellFormed;
}

module.exports = { CH, TITLE, stats, ok, report, DOC, QUIZ };

if (require.main === module) {
  const s = stats();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(s));
  } else {
    report(s);
    if (!ok(s)) { console.error('自检未通过'); process.exit(1); }
  }
}
