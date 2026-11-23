#!/usr/bin/env node
/**
 * 中医诊断学 · 第 11 章 证候规范化：38 条命名里，只有 18 条真挂上了 ICD-11
 *
 *   node code/main.js
 *
 * 正文：chapters/11-zhenghou-guifan/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：病案十二项、命名三条件、对账检查表八行，并核
 * 「带编码 14 = 站得住 1 + 过窄 5 + 冲突 6 + 查不到码 2」这一加总。
 * 数的是去重后的病名与能对上的编码，不是表里的行数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 11;
const SLUG = '11-zhenghou-guifan';
const TITLE = '证候规范化：38 条命名里，只有 18 条真挂上了 ICD-11';

const numOf = (row) => Number(String(row && row[1] || '').replace(/[^\d]/g, ''));

function analyze() {
  const s = shape(DIR);
  const check = tableByHeader(s.tables, '含义');
  const pick = (name) => check.rows.find((r) => r[0] === name) || [];
  const coded = numOf(pick('带编码的病名'));
  const buckets = ['对账站得住', '过窄', '冲突', '查不到码'].map((k) => ({ k, n: numOf(pick(k)) }));
  const facts = [
    { label: '病案项数', got: tableByHeader(s.tables, '采集要求').rows.length, want: 12 },
    { label: '命名三条件', got: tableByHeader(s.tables, '问什么').rows.length, want: 3 },
    { label: '对账检查行', got: check.rows.length, want: 8 },
    { label: '带编码病名', got: coded, want: 14 },
    { label: '四类相加', got: buckets.reduce((a, b) => a + b.n, 0), want: coded },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 5 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 8 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 4 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 3 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 2019 },
  ];
  const quiz = quizSummary(JSON.parse(fs.readFileSync(QUIZ, 'utf8')), s.body);
  return { s, facts, buckets, quiz, quotes: s.quotes };
}

function main() {
  const r = analyze();
  console.log(`中医诊断学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.s.hanzi} 汉字 · ${r.s.sections.length} 节 · ${r.s.tableCount} 表 · 引文 ${r.quotes.length} 条`);
  console.log('');
  console.log('对账分布：' + r.buckets.map((b) => `${b.k} ${b.n}`).join(' · '));
  for (const f of r.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} → 正文 ${f.want}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）`);
  console.log(`  check 接地 ${r.quiz.checkGrounded} 道 · 答案位置 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 教学边界：计数反映这份数据的对齐程度，不代表证候规范化的整体状况；本章不构成诊断建议。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
