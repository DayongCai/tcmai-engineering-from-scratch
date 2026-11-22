#!/usr/bin/env node
/**
 * 智能毕业设计与知识移交 · 第 2 章 · 标注规范
 * 课程: departments/07-zhineng/19-zhineng-biye-sheji/chapters/02-shujuji-biaozhu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   规范五件套、一致性区间、四种切法、数据卡字段、失败模式，
 *   以及标注量、双标比例与人月口径；quiz 的接地情况也在这里对一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-shujuji-biaozhu';
const TITLE = '标注规范不是给数据打标签，是把「谁说了算」写进文件';

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

/** 规范五件套 */
const pieces = () => firstColumn(0);

/** 一致性区间的四个档（按表内顺序） */
const kappaBands = () => firstColumn(1);

/** 一致性区间的下界（把「低于 0.4」「0.4–0.6」… 解析成数） */
function kappaFloors() {
  return kappaBands().map((s) => {
    const m = /([\d.]+)/.exec(s);
    return m ? Number(m[1]) : null;
  });
}

/** 四种切法的单位与名称 */
const splits = () => firstColumn(2);

/** 数据卡的字段清单 */
const cardFields = () => firstColumn(3);

/** 常见失败模式 */
const failures = () => firstColumn(4);

/** 正文口径：标注集规模（条） */
const recordCount = () => {
  const m = /([\d,]+)\s*条的病历标注集/.exec(readDoc());
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

/** 正文口径：保留的双标比例（百分数，取上下限） */
function dualRatio() {
  const m = /(\d+)%[–-](\d+)%/.exec(readDoc());
  return m ? { min: Number(m[1]), max: Number(m[2]) } : null;
}

/** 正文口径：数据阶段的人月 */
const dataMonths = () => {
  const m = /通常给数据留\s*(\d+)\s*人月/.exec(readDoc());
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
    pieces: pieces(),
    kappaBands: kappaBands(),
    kappaFloors: kappaFloors(),
    splits: splits(),
    cardFields: cardFields(),
    failures: failures(),
    recordCount: recordCount(),
    dualRatio: dualRatio(),
    dataMonths: dataMonths(),
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
  console.log(`规范五件套（${r.pieces.length} 件）：${r.pieces.join(' / ')}`);
  console.log(`一致性区间（${r.kappaBands.length} 档，下界）：` + r.kappaBands.map((b, i) => `${b}(${r.kappaFloors[i]})`).join(' · '));
  console.log(`切法（${r.splits.length} 种）：${r.splits.join(' / ')}`);
  console.log(`数据卡字段（${r.cardFields.length} 个）：${r.cardFields.join(' / ')}`);
  console.log(`失败模式（${r.failures.length} 种）：${r.failures.join(' / ')}`);
  console.log('');
  console.log(
    `口径：标注集 ${r.recordCount === null ? '—' : r.recordCount.toLocaleString('en-US')} 条 · 双标比例 ${r.dualRatio ? `${r.dualRatio.min}%–${r.dualRatio.max}%` : '—'} · 数据阶段 ${r.dataMonths} 人月`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或诊断依据；真实病历数据须依伦理审查与数据安全要求办理。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  pieces,
  kappaBands,
  kappaFloors,
  splits,
  cardFields,
  failures,
  recordCount,
  dualRatio,
  dataMonths,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
