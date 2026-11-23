#!/usr/bin/env node
/**
 * 中医诊断学 · 第 10 章 六经与卫气营血：三套坐标，13 个节点，1,767 字
 *
 *   node code/main.js
 *
 * 正文：chapters/10-liujing-weifen/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：13 个节点按三套坐标分组（六经 6 / 卫气营血 4 / 三焦 3），
 * 以及八列记录、五条触发、三条失效模式。分组数由表内首列统计而来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 10;
const SLUG = '10-liujing-weifen';
const TITLE = '六经与卫气营血：三套坐标，13 个节点，1,767 字';

function analyze() {
  const s = shape(DIR);
  const nodes = tableByHeader(s.tables, '提纲项');
  const count = (name) => nodes.rows.filter((r) => r[0] === name).length;
  const facts = [
    { label: '节点合计', got: nodes.rows.length, want: 13 },
    { label: '六经', got: count('六经'), want: 6 },
    { label: '卫气营血', got: count('卫气营血'), want: 4 },
    { label: '三焦', got: count('三焦'), want: 3 },
    { label: '三层相加', got: count('六经') + count('卫气营血') + count('三焦'), want: nodes.rows.length },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 8 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 5 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 3 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 1552 },
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
  console.log('※ 教学边界：三套坐标之间没有换算表，教材也没有；本章只做定位与记录，不构成诊断建议。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
