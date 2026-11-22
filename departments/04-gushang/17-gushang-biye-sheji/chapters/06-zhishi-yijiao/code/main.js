#!/usr/bin/env node
/**
 * 骨伤毕业设计与知识移交 · 第 6 章 · 知识移交
 * 课程: departments/04-gushang/17-gushang-biye-sheji/chapters/06-zhishi-yijiao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的交接包四件、SOP 五问、三条验收动作、五条退役条件、六种失败模式，
 * 以及成本与回本口径、参数外置与责任边界的判断句，全部从正文现算，不手打。
 * 验收动作与其「通过标准」同表成对读出，避免动作与判据脱钩。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-zhishi-yijiao';
const TITLE = '移交不是交一份文档，是让没参与过的人在离开你之后跑出同一个数、做出同一套手法';

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

/** 交接包四件 */
const handoverPackage = () => firstColumn(0);

/** SOP 的五个问题 */
const sopQuestions = () => firstColumn(1);

/** 三条验收动作：复算、改一处、找一处错 */
const acceptance = () => firstColumn(2);

/** 每条验收动作的通过标准 */
function acceptanceCriteria() {
  const acts = acceptance();
  const pass = column(2, 2);
  const fail = column(2, 3);
  return acts.map((a, i) => ({ action: a, pass: pass[i] || '', failureMeans: fail[i] || '' }));
}

/** 五条退役条件 */
const retirement = () => firstColumn(3);

/** 六种常见失败模式 */
const failures = () => firstColumn(4);

/** 正文口径：本系毕设的建设成本（元）与回本中位（月） */
function budget() {
  const text = readDoc();
  const cost = /建设成本\s*([\d,]+)\s*元/.exec(text);
  const payback = /回本中位\s*([\d.]+)\s*个月/.exec(text);
  return {
    cost: cost ? Number(cost[1].replace(/,/g, '')) : null,
    payback: payback ? Number(payback[1]) : null,
  };
}

/** 参数外置：正文说所有可调输入该放在哪里 */
function paramExternal() {
  const text = readDoc();
  const m = /所有可调的输入[^。]*都应该在配置文件里/.exec(text);
  return m ? m[0] : null;
}

/** 责任边界：正文的判断句 */
function responsibilityBoundary() {
  const text = readDoc();
  const m = /交付物提供的是判断依据，不是判断本身/.exec(text);
  return m ? m[0] : null;
}

/** 退役条件里「性能漂移」的可测判据 */
function driftCriterion() {
  const text = readDoc();
  const m = /按固定周期在固定复评样本上重算主终点[^。]*/.exec(text);
  return m ? m[0].replace(/\*\*/g, '') : null;
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
    tables: tableBlocks(text).length,
    handoverPackage: handoverPackage(),
    sopQuestions: sopQuestions(),
    acceptance: acceptance(),
    acceptanceCriteria: acceptanceCriteria(),
    retirement: retirement(),
    failures: failures(),
    budget: budget(),
    paramExternal: paramExternal(),
    responsibilityBoundary: responsibilityBoundary(),
    driftCriterion: driftCriterion(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤毕业设计与知识移交 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`交接包（${r.handoverPackage.length} 件）：${r.handoverPackage.join(' / ')}`);
  console.log(`  参数外置：${r.paramExternal || '—'}`);
  console.log('');
  console.log(`SOP 五问（${r.sopQuestions.length} 问）：${r.sopQuestions.join(' / ')}`);
  console.log('');
  console.log('三条验收动作与通过标准（同表成对读出）：');
  for (const a of r.acceptanceCriteria) console.log(`  ${a.action.padEnd(5)} → ${a.pass}`);
  console.log('');
  console.log(`五条退役条件（${r.retirement.length} 条）：${r.retirement.join(' / ')}`);
  console.log(`  性能漂移的判据：${r.driftCriterion || '—'}`);
  console.log(`  责任边界：${r.responsibilityBoundary || '—'}`);
  console.log('');
  console.log(`六种失败模式：${r.failures.join(' / ')}`);
  const b = r.budget;
  console.log('');
  console.log(
    `口径：建设成本 ${b.cost === null ? '—' : b.cost.toLocaleString('en-US')} 元 · 回本中位 ${b.payback === null ? '—' : b.payback} 个月（本系毕设口径的教学数字）`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上结构、配线、判据与口径全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议，也不构成合规或法律意见。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  firstColumn,
  column,
  handoverPackage,
  sopQuestions,
  acceptance,
  acceptanceCriteria,
  retirement,
  failures,
  budget,
  paramExternal,
  responsibilityBoundary,
  driftCriterion,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
