#!/usr/bin/env node
/**
 * 智能毕业设计与知识移交 · 第 3 章 · 消融
 * 课程: departments/07-zhineng/19-zhineng-biye-sheji/chapters/03-fangfa-xiaorong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   管线四段、基线三档、三种消融设计、复现三件、失败模式，
 *   以及全组合组数与反向替换的两个掉分；quiz 的接地情况也在这里对一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-fangfa-xiaorong';
const TITLE = '消融不是删模块看掉多少分，是回答「哪一步在替我说话」';

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

/** 管线四段 */
const stages = () => firstColumn(0);

/** 基线三档的编号（B0/B1/B2） */
const baselines = () => firstColumn(1).map((s) => (/^(B\d)/.exec(s) || [null, s])[1]);

/** 三种消融设计 */
const designs = () => firstColumn(2);

/** 复现三件 */
const repro = () => firstColumn(3);

/** 常见失败模式 */
const failures = () => firstColumn(4);

/** 全组合组数：正文「要跑 2³ = 8 组配置」 */
const comboGroups = () => {
  const m = /2³\s*=\s*(\d+)\s*组/.exec(readDoc());
  return m ? Number(m[1]) : null;
};

/** 组件数升到五个时的组数：正文「五个组件就是 32 组」 */
const comboGroupsFive = () => {
  const m = /五个组件就是\s*(\d+)\s*组/.exec(readDoc());
  return m ? Number(m[1]) : null;
};

/** 反向替换的两个掉分：换弱实现从 8 个点缩到 2 个点 */
function replacementDrops() {
  const m = /去掉它掉\s*(\d+)\s*个点[^。]*?只掉\s*(\d+)\s*个点/.exec(readDoc());
  return m ? { strong: Number(m[1]), weak: Number(m[2]) } : null;
}

/** 正文口径：实现与实验两阶段占的人月 */
const experimentMonths = () => {
  const m = /约占\s*(\d+)\s*人月/.exec(readDoc());
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
    stages: stages(),
    baselines: baselines(),
    designs: designs(),
    repro: repro(),
    failures: failures(),
    comboGroups: comboGroups(),
    comboGroupsFive: comboGroupsFive(),
    replacementDrops: replacementDrops(),
    experimentMonths: experimentMonths(),
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
  console.log(`管线四段（${r.stages.length} 段）：${r.stages.join(' → ')}`);
  console.log(`基线三档（${r.baselines.length} 档）：${r.baselines.join(' < ')}`);
  console.log(`消融设计（${r.designs.length} 种）：${r.designs.join(' / ')}`);
  console.log(`复现三件（${r.repro.length} 件）：${r.repro.join(' / ')}`);
  console.log(`失败模式（${r.failures.length} 种）：${r.failures.join(' / ')}`);
  console.log('');
  console.log(`全组合组数：三组件 ${r.comboGroups} 组（正文 2³），五组件 ${r.comboGroupsFive} 组`);
  console.log(
    `反向替换：强实现掉 ${r.replacementDrops ? r.replacementDrops.strong : '—'} 个点，换弱实现只掉 ${r.replacementDrops ? r.replacementDrops.weak : '—'} 个点`
  );
  console.log(`口径：实现与实验两阶段约占 ${r.experimentMonths} 人月`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或诊断建议；涉及真实临床数据须依伦理与数据安全要求办理。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  stages,
  baselines,
  designs,
  repro,
  failures,
  comboGroups,
  comboGroupsFive,
  replacementDrops,
  experimentMonths,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
