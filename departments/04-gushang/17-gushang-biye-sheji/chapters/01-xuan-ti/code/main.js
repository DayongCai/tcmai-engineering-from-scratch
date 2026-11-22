#!/usr/bin/env node
/**
 * 骨伤毕业设计与知识移交 · 第 1 章 · 选题
 * 课程: departments/04-gushang/17-gushang-biye-sheji/chapters/01-xuan-ti/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的三条判据、四步降维、三份产物的形态、四个里程碑、五种失败模式，
 * 以及文中的成本与回本口径，全部从正文的表格与段落现算，不手打：
 * 正文一改，重跑就能看出哪一格对不上；测试再把它们固定住。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-xuan-ti';
const TITLE = '选题不是挑一个病种，是把一套复位方案压成一条别人能复算的命题';

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

/** 连续以 | 开头的行成一张表；返回 { head, rows }，rows 去掉表头与分隔行 */
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

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 第 i 张表的第一列（不含表头） */
function firstColumn(i) {
  const b = tableBlocks(readDoc())[i];
  return b ? b.rows.map((r) => r[0]) : [];
}

/** 三条判据：可复现、可对照、可接手 */
const criteria = () => firstColumn(0);

/** 四步降维：问题、对象、任务、终点 */
const dimensions = () => firstColumn(1);

/** 三种能交出去的毕设产物 */
const forms = () => firstColumn(2);

/** 四个里程碑的编号（M1…M4） */
const milestones = () => firstColumn(3).map((s) => (/^(M\d)/.exec(s) || [null, s])[1]);

/** 五种常见失败模式 */
const failures = () => firstColumn(4);

/**
 * 三条判据的分量次序：正文用加粗句「可对照最硬」「可复现次之」
 * 「可接手最软」把次序写死，这里按加粗片段在正文里的出现位置排序。
 */
function rank() {
  const text = readDoc();
  return ['可对照', '可复现', '可接手']
    .map((k) => ({ key: k, at: text.search(new RegExp(`\\*\\*${k}`)) }))
    .map((x) => ({ ...x, at: x.at < 0 ? Number.MAX_SAFE_INTEGER : x.at }))
    .sort((a, b) => a.at - b.at);
}

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

/** 正文口径：四步降维的第三步把「愿望」与「任务」分开的那句话 */
function taskSentence() {
  const text = readDoc();
  const m = /「提高疗效」不是任务，它是愿望/.exec(text);
  return m ? m[0] : null;
}

/** quiz 的结构与接地情况：check 题的正确选项能对上几个四字原词 */
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
    criteria: criteria(),
    dimensions: dimensions(),
    forms: forms(),
    milestones: milestones(),
    failures: failures(),
    rank: rank(),
    budget: budget(),
    taskSentence: taskSentence(),
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
  console.log(`三条判据（${r.criteria.length} 条）：${r.criteria.join(' / ')}`);
  console.log(`  分量次序（按正文加粗句定位）：${r.rank.map((x) => x.key).join(' > ')}`);
  console.log('');
  console.log(`四步降维（${r.dimensions.length} 步）：${r.dimensions.join(' → ')}`);
  console.log(`第三步的判据句：${r.taskSentence || '—'}`);
  console.log('');
  console.log(`三份产物（${r.forms.length} 类）：${r.forms.join(' / ')}`);
  console.log(`四个里程碑（${r.milestones.length} 个）：${r.milestones.join(' ')}`);
  console.log(`五种失败模式（${r.failures.length} 种）：${r.failures.join(' / ')}`);
  console.log('');
  const b = r.budget;
  console.log(
    `口径：建设成本 ${b.cost === null ? '—' : b.cost.toLocaleString('en-US')} 元 · 回本中位 ${b.payback === null ? '—' : b.payback} 个月（本系毕设口径的教学数字）`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上结构、次序与口径全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议，也不构成商业报价。');
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
  criteria,
  dimensions,
  forms,
  milestones,
  failures,
  rank,
  budget,
  taskSentence,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
