#!/usr/bin/env node
/**
 * 中医诊断学 · 第 5 章 问诊：标题写「十问歌」，实际只列了八节
 *
 *   node code/main.js
 *
 * 正文：chapters/05-wenzhen-wenjuan/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：4.2 的八节 + 歌诀十问的差集 2 问、三段式六行、六组判据、
 * 五种作废情形、十列记录、六条触发、四条失效模式。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 5;
const SLUG = '05-wenzhen-wenjuan';
const TITLE = '问诊：标题写「十问歌」，实际只列了八节';

function analyze() {
  const s = shape(DIR);
  const sections42 = tableByHeader(s.tables, '问什么').rows.length;
  const codeTen = 10; // 歌诀「十问」
  const facts = [
    { label: '歌诀十问', got: codeTen, want: 10 },
    { label: '4.2 列出的节', got: sections42, want: 8 },
    { label: '差集', got: codeTen - sections42, want: 2 },
    { label: '三段式行数', got: tableByHeader(s.tables, '必填').rows.length, want: 6 },
    { label: '判据组', got: tableByHeader(s.tables, '缺项后果').rows.length, want: 6 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 5 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 10 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 6 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 4 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 2013 },
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
  console.log('※ 教学边界：差集是本课程对表的结果，教材并未声明少两问；本章不构成诊断建议。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
