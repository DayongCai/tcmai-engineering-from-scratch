#!/usr/bin/env node
/**
 * 中医诊断学 · 第 12 章 诊断推理的误差来源：教材给了四条来源，没给一个百分比
 *
 *   node code/main.js
 *
 * 正文：chapters/12-zhenduan-wucha/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：四条来源、三组判据、八项检查表、四条作废情形、四条触发、三条失效模式，
 * 并数一遍正文里百分号出现的次数——这个数本身就是本章的论点。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 12;
const SLUG = '12-zhenduan-wucha';
const TITLE = '诊断推理的误差来源：教材给了四条来源，没给一个百分比';

function analyze() {
  const s = shape(DIR);
  const facts = [
    { label: '误差来源', got: tableByHeader(s.tables, '那里在讲什么').rows.length, want: 4 },
    { label: '可指认三条', got: numberedItems(s.body, '二、成组判据'), want: 3 },
    { label: '判据组', got: tableByHeader(s.tables, '缺项后果').rows.length, want: 4 },
    { label: '检查表项', got: tableByHeader(s.tables, '判定').rows.length, want: 8 },
    { label: '正文百分号', got: (s.body.match(/%/g) || []).length, want: 0 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 4 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 4 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 3 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 1883 },
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
  console.log('※ 教学边界：正文里没有百分比，本章也不给误诊率；检查表是教学工具，不是病历质量评分标准。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
