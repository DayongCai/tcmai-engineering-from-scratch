#!/usr/bin/env node
/**
 * 中医诊断学 · 第 9 章 气血津液辨证：770 字的气血，和只有 175 字的七情
 *
 *   node code/main.js
 *
 * 正文：chapters/09-qixue-bianzheng/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：14 个证（气病 4 + 血病 5 + 气血同病 5）能否加总成立，
 * 以及四行病因、三列本体、九组判据、五条作废情形、九列记录、五条触发、三条失效模式。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 9;
const SLUG = '09-qixue-bianzheng';
const TITLE = '气血津液辨证：770 字的气血，和只有 175 字的七情';

function analyze() {
  const s = shape(DIR);
  const m = /(\d+)\s*个证（气病\s*(\d+)、血病\s*(\d+)、气血同病\s*(\d+)）/.exec(s.body) || [];
  const totalZheng = Number(m[1]);
  const qi = Number(m[2]);
  const xue = Number(m[3]);
  const tong = Number(m[4]);
  const facts = [
    { label: '证数（正文）', got: totalZheng, want: 14 },
    { label: '气病', got: qi, want: 4 },
    { label: '血病', got: xue, want: 5 },
    { label: '气血同病', got: tong, want: 5 },
    { label: '三类相加', got: qi + xue + tong, want: totalZheng },
    { label: '病因行', got: tableByHeader(s.tables, '采什么').rows.length, want: 4 },
    { label: '判据组', got: tableByHeader(s.tables, '必具项').rows.length, want: 9 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 5 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 9 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 5 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 3 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 1959 },
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
  console.log('※ 教学边界：证名的篇幅比例只说明「证密字疏」，不推断气血辨证的临床权重；本章不构成诊断建议。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
