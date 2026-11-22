#!/usr/bin/env node
/**
 * 中医智能设备 · 第 5 章 · 从样机到器械：四道门，以及一道不该打开的门
 * 课程: departments/07-zhineng/03-zhongyi-zhineng-shebei/chapters/05-q5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的分层与清单全部由本脚本从正文现算，不手打：
 *   五类技术、七件实训设备的四元覆盖、三种集成形态、四道门、
 *   治疗类设备的三层保护、光遗传学不进临床的三条理由。
 * 正文一改，重跑即可看出哪一条对不上；测试把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-q5';
const TITLE = '从样机到器械：四道门，以及一道不该打开的门';

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

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

/** 五类技术：第一节里每段的加粗开头 */
function techClasses(text) {
  return [...sectionAt(text, 0).matchAll(/^\*\*([^*]+)\*\*/gm)].map((m) => m[1].trim());
}

/** 实训设备：表体三列（设备、覆盖、能演示什么） */
function devices(text) {
  const b = tableBlocks(text)[0];
  if (!b) return [];
  return b.rows.map((r) => ({ device: r[0], coverage: r[1] || '', demo: r[2] || '' }));
}

/** 四元覆盖：设备覆盖列里出现了哪几元，另加化学件的计数 */
function coverage(text) {
  const cells = devices(text).map((d) => d.coverage);
  const elements = ['P', 'E', 'M', 'K'].filter((e) => cells.some((c) => c.includes(e)));
  const chem = cells.filter((c) => c.includes('化学')).length;
  return { elements, chem, total: elements.length };
}

/** 三种集成形态：第二节的三行加粗 */
function forms(text) {
  return [...sectionAt(text, 2).matchAll(/^\*\*([^*]+)\*\*[：:]/gm)].map((m) => m[1].trim());
}

/** 四道门 */
function gates(text) {
  return [...sectionAt(text, 3).matchAll(/\*\*(第[一二三四]道)[，,](.+?)。\*\*/g)].map((m) => ({ n: m[1], name: m[2].trim() }));
}

/** 治疗类设备的三层保护 */
function protections(text) {
  const out = [];
  for (const m of sectionAt(text, 4).matchAll(/(硬件限位|软件互锁|人工急停)/g)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** 光遗传学不进临床的三条理由 */
function optoReasons(text) {
  return [...sectionAt(text, 5).matchAll(/\*\*第[一二三][，,](.+?)。\*\*/g)].map((m) => m[1].trim());
}

/** 实训的三个动作：采一次 / 破坏一个条件再采 / 比较并说出差异 */
function trainActions(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('三个动作')) || '';
  const tail = (/三个动作[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail
    .replace(/\*\*/g, '')
    .split(/[；;]/)
    .map((s) => s.trim())
    .filter(Boolean);
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
    correctIndexes: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length })),
    classes: techClasses(text),
    devices: devices(text),
    coverage: coverage(text),
    forms: forms(text),
    gates: gates(text),
    protections: protections(text),
    opto: optoReasons(text),
    actions: trainActions(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医智能设备 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表 ${r.tables.length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`五类技术（${r.classes.length} 类）：${r.classes.join(' / ')}`);
  console.log(`实训设备（${r.devices.length} 件）：`);
  r.devices.forEach((d) => console.log(`  ${d.coverage.padEnd(4)} ${d.device}`));
  console.log(
    `四元覆盖 ${r.coverage.total}/4：${r.coverage.elements.join(' · ')}；另化学件 ${r.coverage.chem} 件`
  );
  console.log('');
  console.log(`三种集成形态：${r.forms.join(' / ')}`);
  console.log(`四道门（${r.gates.length} 道）：${r.gates.map((g) => g.name).join(' → ')}`);
  console.log(`治疗类三层保护：${r.protections.join(' / ')}`);
  console.log(`实训三动作（${r.actions.length} 个）：${r.actions.join(' ; ')}`);
  console.log(`光遗传学不进临床的理由（${r.opto.length} 条）：${r.opto.join(' / ')}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 正确项落点 ${[...new Set(r.quiz.correctIndexes)].join('/')}`
  );
  console.log('');
  console.log('※ 以上分层与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议，也不构成对任何产品或技术的合规结论。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Sections,
  h2Titles,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  techClasses,
  devices,
  coverage,
  forms,
  gates,
  protections,
  optoReasons,
  trainActions,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
