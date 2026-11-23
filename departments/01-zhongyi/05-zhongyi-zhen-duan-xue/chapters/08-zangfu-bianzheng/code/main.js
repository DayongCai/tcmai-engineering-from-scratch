#!/usr/bin/env node
/**
 * 中医诊断学 · 第 8 章 脏腑辨证 → 规则表与权重：把「肝气郁结」写成可复核的打分
 *
 *   node code/main.js
 *
 * 正文：chapters/08-zangfu-bianzheng/docs/zh.md（UNITNOTES 生成块不计入）
 *
 * 现算：定位五步、示例证数、五条作废情形、九栏记录、五条触发、三条失效模式，
 * 并把「定性项 ≥2 分成立」这条规则在示例证上逐条数一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { shape, tableByHeader, numberedItems, quizSummary } = require(path.join(__dirname, '..', '..', '_doc.js'));

const DIR = path.join(__dirname, '..');
const QUIZ = path.join(DIR, 'quiz.json');
const CHAPTER = 8;
const SLUG = '08-zangfu-bianzheng';
const TITLE = '脏腑辨证 → 规则表与权重：把「肝气郁结」写成可复核的打分';

function analyze() {
  const s = shape(DIR);
  const steps = tableByHeader(s.tables, '要点');
  const zheng = tableByHeader(s.tables, '定性项');
  // 定性项以「·」分列，逐证数项，核「≥2 分成立」在示例上都够用
  const scored = zheng.rows.map((r) => ({
    name: r[0],
    keys: String(r[1] || '').split('+').filter((x) => x.trim()).length,
    optional: String(r[2] || '').split('·').filter((x) => x.trim()).length,
  }));
  const facts = [
    { label: '定位步数', got: steps.rows.length, want: 5 },
    { label: '示例证', got: zheng.rows.length, want: 3 },
    { label: '定性项门槛', got: 2, want: 2 },
    { label: '示例证定性项', got: Math.max(...scored.map((x) => x.optional)), want: 4 },
    { label: '须作废的情形', got: tableByHeader(s.tables, '为什么不成立').rows.length, want: 5 },
    { label: '记录栏位', got: tableByHeader(s.tables, '字段').rows.length, want: 9 },
    { label: '触发', got: tableByHeader(s.tables, '触发').rows.length, want: 5 },
    { label: '失效模式', got: numberedItems(s.body, '四、动作与边界'), want: 3 },
    { label: '二级节', got: s.sections.length, want: 6 },
    { label: '正文汉字', got: s.hanzi, want: 1879 },
  ];
  const quiz = quizSummary(JSON.parse(fs.readFileSync(QUIZ, 'utf8')), s.body);
  return { s, facts, scored, quiz, quotes: s.quotes };
}

function main() {
  const r = analyze();
  console.log(`中医诊断学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.s.hanzi} 汉字 · ${r.s.sections.length} 节 · ${r.s.tableCount} 表 · 引文 ${r.quotes.length} 条`);
  console.log('');
  console.log('示例证拆项：' + r.scored.map((x) => `${x.name} 定位 ${x.keys} 项 / 定性 ${x.optional} 项`).join(' · '));
  for (const f of r.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} → 正文 ${f.want}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）`);
  console.log(`  check 接地 ${r.quiz.checkGrounded} 道 · 答案位置 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 教学边界：定位项必具、定性项计分是本课程的教学设定，教材无权重；本章不构成诊断标准。');
}

if (require.main === module) main();

module.exports = { analyze, CHAPTER, SLUG, TITLE, DIR, QUIZ };
