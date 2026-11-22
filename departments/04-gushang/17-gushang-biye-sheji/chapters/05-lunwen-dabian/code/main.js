#!/usr/bin/env node
/**
 * 骨伤毕业设计与知识移交 · 第 5 章 · 论文写作与答辩
 * 课程: departments/04-gushang/17-gushang-biye-sheji/chapters/05-lunwen-dabian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的六段骨架、图表四律、数字一致性五做法、自评七项、答辩三类、六种失败模式，
 * 以及五分钟陈述的段数与时长口径，全部从正文表格与段落现算，不手打。
 * 六段与各自的检验句成对读出，避免骨架与判据脱钩。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-lunwen-dabian';
const TITLE = '论文不是把做过的事按时间讲一遍，是把「别人凭什么信你」按证据强度排好';

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

function h3Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^###\s+(.+)$/.exec(line.trim());
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
    const cells = b.map((r) =>
      r
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    );
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

function column(i, j) {
  const b = tableBlocks(readDoc())[i];
  return b ? b.rows.map((r) => r[j] || '') : [];
}

/** 六段骨架：问题、数据、方法、结果、边界、入口 */
const skeleton = () => firstColumn(0);

/** 每一段的一句话检验 */
function skeletonChecks() {
  const keys = skeleton();
  const checks = column(0, 2);
  return keys.map((k, i) => ({ section: k, check: checks[i] || '' }));
}

/** 图表四律 */
const figureRules = () => firstColumn(1);

/** 数字一致性的五个做法 */
const numberRules = () => firstColumn(2);

/** 答辩前自评七项 */
const selfChecks = () => firstColumn(3);

/** 答辩三类必答题 */
const defenseClasses = () => firstColumn(4);

/** 六种常见失败模式 */
const failures = () => firstColumn(5);

/** 正文口径：五分钟陈述的段数与每段时长 */
function statementRule() {
  const text = readDoc();
  const segs = /固定成五段/.test(text) ? 5 : null;
  const minutes = /每段一分钟/.test(text) ? 1 : null;
  return { segments: segs, minutesEach: minutes, total: segs && minutes ? segs * minutes : null };
}

/** 正文里对图表顺序的要求句 */
function figureOrderRule() {
  const text = readDoc();
  const m = /图的顺序要跟论证顺序一致/.exec(text);
  return m ? m[0] : null;
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
      const right = String((q.options || [])[q.correct] || '');
      return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
    });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    subSections: h3Titles(text),
    tables: tableBlocks(text).length,
    skeleton: skeleton(),
    skeletonChecks: skeletonChecks(),
    figureRules: figureRules(),
    numberRules: numberRules(),
    selfChecks: selfChecks(),
    defenseClasses: defenseClasses(),
    failures: failures(),
    statementRule: statementRule(),
    figureOrderRule: figureOrderRule(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤毕业设计与知识移交 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 子节 ${r.subSections.length} 个 · 表格 ${r.tables} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  if (r.subSections.length) console.log(`  子节：${r.subSections.join(' / ')}`);
  console.log('');
  console.log('六段骨架与各自的检验句（同表成对读出）：');
  for (const s of r.skeletonChecks) console.log(`  ${s.section.padEnd(4)} → ${s.check}`);
  console.log('');
  console.log(`图表四律（${r.figureRules.length} 条）：${r.figureRules.join(' / ')}`);
  console.log(`  顺序要求：${r.figureOrderRule || '—'}`);
  console.log(`数字一致性（${r.numberRules.length} 做法）：${r.numberRules.join(' / ')}`);
  console.log('');
  console.log(`自评七项（${r.selfChecks.length} 项）：${r.selfChecks.join(' / ')}`);
  console.log(`答辩三类（${r.defenseClasses.length} 类）：${r.defenseClasses.join(' / ')}`);
  console.log(`六种失败模式：${r.failures.join(' / ')}`);
  console.log('');
  const st = r.statementRule;
  console.log(`陈述口径：${st.segments} 段 × 每段 ${st.minutesEach} 分钟 = ${st.total} 分钟`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上结构、配线与口径全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、学术规范裁决或合规意见。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h3Titles,
  tableBlocks,
  occurrences,
  grams,
  firstColumn,
  column,
  skeleton,
  skeletonChecks,
  figureRules,
  numberRules,
  selfChecks,
  defenseClasses,
  failures,
  statementRule,
  figureOrderRule,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
