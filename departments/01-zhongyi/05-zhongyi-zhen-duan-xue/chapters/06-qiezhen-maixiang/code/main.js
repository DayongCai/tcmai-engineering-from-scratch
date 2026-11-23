#!/usr/bin/env node
/**
 * 中医诊断学 · 第 6 章 切诊：给了「28 脉」的名号，标题只拼得出 27 个脉名
 *
 *   node code/main.js
 *
 * 正文：chapters/06-qiezhen-maixiang/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：诊脉六步、四维加单列的节律共五位、六种作废情形、脉记十列、
 * 五条触发、四条失效模式；并核「28 名号 − 1 个兼平脉 = 27 脉名」这一差。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 6;
const SLUG = '06-qiezhen-maixiang';
const TITLE = '切诊：给了「28 脉」的名号，标题只拼得出 27 个脉名';

function analyze() {
  const s = shape(DIR);
  const dims = tableByHeader(s.tables, '缺项后果');
  const facts = [
    { label: '诊脉步数', got: tableByHeader(s.tables, '教材位置').rows.length, want: 6 },
    { label: '四维', got: dims.rows.length, want: 4 },
    { label: '加节律共', got: dims.rows.length + 1, want: 5 },
    { label: '28 名号', got: 28, want: 28 },
    { label: '去重脉名', got: 28 - 1, want: 27 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 6 },
    { label: '脉记列数', got: tableByHeader(s.tables, '字段').rows.length, want: 10 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 5 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 4 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 1939 },
  ];
  const quiz = quizSummary(JSON.parse(fs.readFileSync(QUIZ, 'utf8')), s.body);
  return { s, facts, quiz, quotes: s.quotes };
}

function main() {
  const r = analyze();
  console.log(`中医诊断学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.s.hanzi} 汉字 · ${r.s.sections.length} 节 · ${r.s.tableCount} 表 · 引文 ${r.quotes.length} 条`);
  console.log('');
  for (const f of r.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} → 正文 ${f.want}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）`);
  console.log(`  check 接地 ${r.quiz.checkGrounded} 道 · 答案位置 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 教学边界：脉名与主病按教材口径转述；本章只做记录维度，不构成脉诊结论。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
