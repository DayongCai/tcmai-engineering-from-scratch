#!/usr/bin/env node
/**
 * 智能毕业设计与知识移交 · 第 5 章 · 论文与答辩
 * 课程: departments/07-zhineng/19-zhineng-biye-sheji/chapters/05-lunwen-dabian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   六段结构、三张表、答辩时间分配、五个必答题、评审栏，
 *   以及评阅时长、陈述时长与摘要字数口径；quiz 的接地情况也在这里对一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-lunwen-dabian';
const TITLE = '论文不是把做过的事写一遍，是把「别人凭什么信你」按顺序摆出来';

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

/** 六段结构 */
const paragraphs = () => firstColumn(0);

/** 三张表 */
const threeTables = () => firstColumn(1);

/** 答辩时间分配（分钟区间） */
function defenseSlots() {
  const rows = tableBlocks(readDoc())[2].rows;
  return rows
    .map((r) => {
      const m = /^(\d+)[–-](\d+)$/.exec(r[0]);
      return m ? { from: Number(m[1]), to: Number(m[2]), what: r[1] } : null;
    })
    .filter(Boolean);
}

/** 陈述总时长：最后一格的终点 */
function defenseTotal() {
  const slots = defenseSlots();
  return slots.length ? slots[slots.length - 1].to : null;
}

/** 五个必答题 */
const mustAnswer = () => firstColumn(3);

/** 评审栏 */
const reviewFields = () => firstColumn(4);

/** 正文口径：评阅时长（分钟，取区间两端） */
function reviewMinutes() {
  const m = /(\d+)\s*分钟到\s*(\d+)\s*小时/.exec(readDoc());
  return m ? { from: Number(m[1]), to: Number(m[2]) * 60 } : null;
}

/** 正文口径：陈述时长（分钟） */
function talkMinutes() {
  const m = /陈述时间是?\s*(\d+)\s*到\s*(\d+)\s*分钟/.exec(readDoc());
  return m ? { from: Number(m[1]), to: Number(m[2]) } : null;
}

/** 正文口径：摘要字数（常见口径） */
const abstractWords = () => {
  const m = /常见\s*(三百)\s*字上下/.exec(readDoc());
  return m ? 300 : null;
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
    paragraphs: paragraphs(),
    threeTables: threeTables(),
    slots: defenseSlots(),
    defenseTotal: defenseTotal(),
    mustAnswer: mustAnswer(),
    reviewFields: reviewFields(),
    reviewMinutes: reviewMinutes(),
    talkMinutes: talkMinutes(),
    abstractWords: abstractWords(),
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
  console.log(`六段结构（${r.paragraphs.length} 段）：${r.paragraphs.join(' → ')}`);
  console.log(`三张表（${r.threeTables.length} 张）：${r.threeTables.join(' / ')}`);
  console.log(`答辩分配（合计 ${r.defenseTotal} 分钟）：`);
  r.slots.forEach((s) => console.log(`  ${String(s.from).padStart(2)}–${String(s.to).padStart(2)}  ${s.what}`));
  console.log(`五个必答题（${r.mustAnswer.length} 问）：${r.mustAnswer.join(' / ')}`);
  console.log(`评审栏（${r.reviewFields.length} 栏）：${r.reviewFields.join(' / ')}`);
  console.log('');
  console.log(
    `口径：评阅 ${r.reviewMinutes ? `${r.reviewMinutes.from}–${r.reviewMinutes.to}` : '—'} 分钟 · 陈述 ${r.talkMinutes ? `${r.talkMinutes.from}–${r.talkMinutes.to}` : '—'} 分钟 · 摘要约 ${r.abstractWords} 字`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成学术评价意见；具体要求依所在院系的学术规范与评审办法执行。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  paragraphs,
  threeTables,
  defenseSlots,
  defenseTotal,
  mustAnswer,
  reviewFields,
  reviewMinutes,
  talkMinutes,
  abstractWords,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
