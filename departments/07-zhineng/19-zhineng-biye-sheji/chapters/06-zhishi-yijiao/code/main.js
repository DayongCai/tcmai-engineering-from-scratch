#!/usr/bin/env node
/**
 * 智能毕业设计与知识移交 · 第 6 章 · 移交
 * 课程: departments/07-zhineng/19-zhineng-biye-sheji/chapters/06-zhishi-yijiao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   模型卡字段、交接包四件、验收三动作、退役四条件、失败模式，
 *   以及分包定价、回本周期与人月口径；quiz 的接地情况也在这里对一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-zhishi-yijiao';
const TITLE = '移交不是交一份文档，是让接手的人在没有你的情况下跑出同一个数';

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function firstColumn(i) {
  const b = tableBlocks(readDoc())[i];
  return b ? b.rows.map((r) => r[0]) : [];
}

/** 模型卡字段 */
const cardFields = () => firstColumn(0);

/** 交接包四件 */
const bundle = () => firstColumn(1);

/** 验收三动作（正文写成「动作一：复算」这样的标签） */
const actions = () => firstColumn(2);

/** 退役四条件 */
const retireRules = () => firstColumn(3);

/** 常见失败模式 */
const failures = () => firstColumn(4);

/** 正文口径：模块分包定价（元/院） */
const price = () => {
  const m = /([\d,]+)\s*元\/院/.exec(readDoc());
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

/** 正文口径：回本周期（月） */
const payback = () => {
  const m = /回本(?:周期)?\s*([\d.]+)\s*个月/.exec(readDoc());
  return m ? Number(m[1]) : null;
};

/** 正文口径：毕设容量（人月） */
const personMonths = () => {
  const m = /(\d+)\s*人月/.exec(readDoc());
  return m ? Number(m[1]) : null;
};

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).length,
    cardFields: cardFields(),
    bundle: bundle(),
    actions: actions(),
    retireRules: retireRules(),
    failures: failures(),
    price: price(),
    payback: payback(),
    personMonths: personMonths(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`智能毕业设计与知识移交 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`模型卡（${r.cardFields.length} 个字段）：${r.cardFields.join(' / ')}`);
  console.log(`交接包（${r.bundle.length} 件）：${r.bundle.join(' / ')}`);
  console.log(`验收动作（${r.actions.length} 个）：${r.actions.join(' → ')}`);
  console.log(`退役条件（${r.retireRules.length} 条）：${r.retireRules.join(' / ')}`);
  console.log(`失败模式（${r.failures.length} 种）：${r.failures.join(' / ')}`);
  console.log('');
  console.log(
    `口径：模块分包 ${r.price === null ? '—' : r.price.toLocaleString('en-US')} 元/院 · 回本 ${r.payback} 个月 · 毕设容量 ${r.personMonths} 人月`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或合规意见；实际使用与停用须依现行规定与所在机构制度。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  cardFields,
  bundle,
  actions,
  retireRules,
  failures,
  price,
  payback,
  personMonths,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
