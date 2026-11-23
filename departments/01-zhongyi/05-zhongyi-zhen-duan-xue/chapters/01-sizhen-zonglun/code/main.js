#!/usr/bin/env node
/**
 * 中医诊断学 · 第 1 章 四诊总论：教材把「闻」写成最薄的一诊
 *
 *   node code/main.js
 *
 * 正文：chapters/01-sizhen-zonglun/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 本章的数全部从正文的表格与条目现算：采集四步、成组三条、须作废的六种情形、
 * 记录十二列、六条转诊触发、六道考核项。正文一改，这里立刻对不上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 1;
const SLUG = '01-sizhen-zonglun';
const TITLE = '四诊总论：教材把「闻」写成最薄的一诊';

function analyze() {
  const s = shape(DIR);
  const facts = [
    { label: '采集步数', got: tableByHeader(s.tables, '诊法').rows.length, want: 4 },
    { label: '成组三条', got: numberedItems(s.body, '二、成组判据'), want: 3 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 6 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 12 },
    { label: '转诊触发', got: tableByHeader(s.tables, '触发').rows.length, want: 6 },
    { label: '考核项', got: numberedItems(s.body, '六、考核项'), want: 6 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 2008 },
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
  console.log('※ 教学边界：数字由正文现算，用于核对结构；本章为记录流程的教学整理，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
