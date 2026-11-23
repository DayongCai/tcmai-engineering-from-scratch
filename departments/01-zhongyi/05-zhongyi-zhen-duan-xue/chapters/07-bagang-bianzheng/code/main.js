#!/usr/bin/env node
/**
 * 中医诊断学 · 第 7 章 八纲辨证：四对轴 8 纲，16 格组合只点名 2 格
 *
 *   node code/main.js
 *
 * 正文：chapters/07-bagang-bianzheng/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：三轴的 2^3 = 8 格、8 格 × 阴阳归类 = 16 格的来历，
 * 以及八行轴表、五条作废情形、九列记录、四条触发、三条失效模式。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 7;
const SLUG = '07-bagang-bianzheng';
const TITLE = '八纲辨证：四对轴 8 纲，16 格组合只点名 2 格';

function analyze() {
  const s = shape(DIR);
  const axes = tableByHeader(s.tables, '反证项');
  const cells = tableByHeader(s.tables, '常见对应');
  const facts = [
    { label: '证据轴行数', got: axes.rows.length, want: 8 },
    { label: '三轴组合', got: Math.pow(2, 3), want: 8 },
    { label: '八格表行数', got: cells.rows.length, want: 8 },
    { label: '16 格来历', got: cells.rows.length * 2, want: 16 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 5 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 9 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 4 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 3 },
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
  console.log('※ 教学边界：8 格表是本课程据 6.1–6.4 拼的，不是教材原表；本章不构成诊断建议。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
