#!/usr/bin/env node
/**
 * 中医诊断学 · 第 3 章 舌诊：27 个特征词，是望诊里唯一能拆成「离散取值」的部分
 *
 *   node code/main.js
 *
 * 正文：chapters/03-shezhen-tese/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：五组取值与合计 27 词、两组单选、采集五步、四条作废情形、十一列记录、
 * 五条触发、三条失效模式。合计行不手打，由五组逐组相加而来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 3;
const SLUG = '03-shezhen-tese';
const TITLE = '舌诊：27 个特征词，是望诊里唯一能拆成「离散取值」的部分';

function analyze() {
  const s = shape(DIR);
  const groups = tableByHeader(s.tables, '选择方式');
  const words = groups.rows.filter((r) => r[0] !== '合计').map((r) => ({ group: r[0], n: Number(r[2]), mode: r[3] }));
  const totalRow = groups.rows.find((r) => r[0] === '合计') || [];
  const declared = Number(String(totalRow[2] || '').replace(/[^\d]/g, ''));
  const facts = [
    { label: '采集步数', got: tableByHeader(s.tables, '失效表现').rows.length, want: 5 },
    { label: '取值组数', got: words.length, want: 5 },
    { label: '特征词合计', got: words.reduce((a, w) => a + w.n, 0), want: 27 },
    { label: '表内合计行', got: declared, want: 27 },
    { label: '单选组', got: words.filter((w) => w.mode.includes('单选')).length, want: 2 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 4 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 11 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 5 },
    { label: '失效模式', got: numberedItems(s.body, '四、记录字段与边界'), want: 3 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 2212 },
  ];
  const quiz = quizSummary(JSON.parse(fs.readFileSync(QUIZ, 'utf8')), s.body);
  return { s, facts, words, quiz, quotes: s.quotes };
}

function main() {
  const r = analyze();
  console.log(`中医诊断学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.s.hanzi} 汉字 · ${r.s.sections.length} 节 · ${r.s.tableCount} 表 · 引文 ${r.quotes.length} 条`);
  console.log('');
  console.log('五组取值：' + r.words.map((w) => `${w.group} ${w.n}（${w.mode.slice(0, 2)}）`).join(' · '));
  console.log('');
  for (const f of r.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} → 正文 ${f.want}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）`);
  console.log(`  check 接地 ${r.quiz.checkGrounded} 道 · 答案位置 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 教学边界：27 个词是教材给的取值域，本章只做拆栏与记录，不构成舌象判读建议。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
