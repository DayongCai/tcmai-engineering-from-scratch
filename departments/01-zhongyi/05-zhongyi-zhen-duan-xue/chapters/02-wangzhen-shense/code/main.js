#!/usr/bin/env node
/**
 * 中医诊断学 · 第 2 章 望诊：2,812 字里 1,249 字在舌上
 *
 *   node code/main.js
 *
 * 正文：chapters/02-wangzhen-shense/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：五段采集路线的部位数、得神的四项判据、四组判据、四条作废情形、
 * 十二列记录、七条转诊触发、五条失效模式。正文一改这里就报 ✗。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 2;
const SLUG = '02-wangzhen-shense';
const TITLE = '望诊：2,812 字里 1,249 字在舌上';

function analyze() {
  const s = shape(DIR);
  const route = tableByHeader(s.tables, '看什么');
  const groups = tableByHeader(s.tables, '判据组');
  const deShen = groups.rows.find((r) => r[0].startsWith('得神')) || [];
  const facts = [
    { label: '路线部位数', got: route.rows.length, want: 14 },
    { label: '得神判据项', got: String(deShen[1] || '').split('·').filter((x) => x.trim()).length, want: 4 },
    { label: '判据组', got: groups.rows.length, want: 5 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 5 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 12 },
    { label: '转诊触发', got: tableByHeader(s.tables, '触发').rows.length, want: 7 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 5 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 2060 },
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
  console.log('※ 教学边界：数字由正文现算；本章为望诊采集路线的教学整理，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
