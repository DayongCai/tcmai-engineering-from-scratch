#!/usr/bin/env node
/**
 * 智能毕业设计与知识移交 · 第 4 章 · 误差分析
 * 课程: departments/07-zhineng/19-zhineng-biye-sheji/chapters/04-wucha-fenxi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   五个分层维度、混淆矩阵四格、四种输出形态、三种可解释证据、失败模式，
 *   以及总体准确率与三个分层数字的落差；quiz 的接地情况也在这里对一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-wucha-fenxi';
const TITLE = '误差分析不是算准确率，是找出「它错在谁身上」';

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

/** 分层维度 */
const layers = () => firstColumn(0);

/** 混淆矩阵四格（按表的行序） */
const confusionCells = () => firstColumn(1);

/** 输出形态（只有标签 → 标签加依据与弃权，逐级变厚） */
const outputForms = () => firstColumn(2);

/** 可解释性的三种证据 */
const evidences = () => firstColumn(3);

/** 常见失败模式 */
const failures = () => firstColumn(4);

/** 正文 PROBLEM 那一行 */
const problemLine = () => readDoc().split(/\r?\n/).find((l) => l.includes('**PROBLEM:**')) || '';

/** 总体准确率：正文「一个总体准确率 0.86 的模型」 */
const overall = () => {
  const m = /总体准确率\s*(0\.\d+)/.exec(problemLine());
  return m ? Number(m[1]) : null;
};

/** 三个分层的数字：类别、机构、标注者 */
function stratumScores() {
  const line = problemLine();
  const out = [];
  const re = /(某类证型|某家机构的样本|某几位高年资医师标注的病例)\s*(0\.\d+)/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push({ what: m[1], score: Number(m[2]) });
  return out;
}

/** 总体与最差分层的落差 */
function worstGap() {
  const rows = stratumScores();
  const o = overall();
  if (!rows.length || o === null) return null;
  const worst = rows.reduce((a, b) => (b.score < a.score ? b : a));
  return { worst: worst.what, score: worst.score, gap: Number((o - worst.score).toFixed(2)) };
}

/** 正文口径：一百例里错几例 */
function errorsPerHundred() {
  const m = /一百例里错\s*(\d+)\s*例/.exec(problemLine());
  return m ? Number(m[1]) : null;
}

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
    layers: layers(),
    confusionCells: confusionCells(),
    outputForms: outputForms(),
    evidences: evidences(),
    failures: failures(),
    overall: overall(),
    strata: stratumScores(),
    worst: worstGap(),
    errorsPerHundred: errorsPerHundred(),
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
  console.log(`分层维度（${r.layers.length} 个）：${r.layers.join(' / ')}`);
  console.log(`混淆矩阵四格（${r.confusionCells.length} 格）：${r.confusionCells.join(' / ')}`);
  console.log(`输出形态（${r.outputForms.length} 种）：${r.outputForms.join(' → ')}`);
  console.log(`可解释证据（${r.evidences.length} 种）：${r.evidences.join(' / ')}`);
  console.log(`失败模式（${r.failures.length} 种）：${r.failures.join(' / ')}`);
  console.log('');
  console.log(`总体准确率 ${r.overall} · 分层：${r.strata.map((s) => `${s.what} ${s.score}`).join(' · ')}`);
  console.log(
    `最差分层与总体的落差：${r.worst ? `${r.worst.worst} ${r.worst.score}，差 ${r.worst.gap}` : '—'}`
  );
  console.log(`口径：一百例里错 ${r.errorsPerHundred} 例`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或诊断建议；真实病例分析须依伦理与数据安全要求办理。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  layers,
  confusionCells,
  outputForms,
  evidences,
  failures,
  problemLine,
  overall,
  stratumScores,
  worstGap,
  errorsPerHundred,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
