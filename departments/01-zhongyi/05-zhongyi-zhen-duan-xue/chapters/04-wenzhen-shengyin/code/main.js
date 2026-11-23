#!/usr/bin/env node
/**
 * 中医诊断学 · 第 4 章 闻诊：一半内容（嗅）没有量表，所以它只有 855 字
 *
 *   node code/main.js
 *
 * 正文：chapters/04-wenzhen-shengyin/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：正文自己写的 855 = 684（听）+ 171（嗅）能否相加成立，
 * 以及采集九项、五组判据、五种作废情形、十列记录、五条触发、四条失效模式。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 4;
const SLUG = '04-wenzhen-shengyin';
const TITLE = '闻诊：一半内容（嗅）没有量表，所以它只有 855 字';

const grab = (text, re) => {
  const m = re.exec(text);
  return m ? Number(m[1]) : NaN;
};

function analyze() {
  const s = shape(DIR);
  const total = grab(s.body, /共\s*(\d+)\s*字，切两半/);
  const listen = grab(s.body, /声音\s*(\d+)\s*字/);
  const smell = grab(s.body, /气味\s*(\d+)\s*字/);
  const facts = [
    { label: '闻诊总字数', got: total, want: 855 },
    { label: '听的一半', got: listen, want: 684 },
    { label: '嗅的一半', got: smell, want: 171 },
    { label: '两半相加', got: listen + smell, want: total },
    { label: '采集项', got: tableByHeader(s.tables, '听／嗅什么').rows.length, want: 9 },
    { label: '判据组', got: tableByHeader(s.tables, '必须同时成立').rows.length, want: 5 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 5 },
    { label: '记录列数', got: tableByHeader(s.tables, '字段').rows.length, want: 10 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 5 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 4 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 2087 },
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
  console.log('※ 教学边界：字数只说明哪一半写不出判据，不代表闻诊的临床权重；本章不构成诊断建议。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
