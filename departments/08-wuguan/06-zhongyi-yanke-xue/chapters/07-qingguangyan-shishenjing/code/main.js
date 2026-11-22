#!/usr/bin/env node
/**
 * 中医眼科学 · 第 7 章 · 绿风内障与视神经：唯一不能「先辨证再看看」的病
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/07-qingguangyan-shishenjing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、发作期的三个动作、六条常见诱因、
 *   典型发作的症状项数、青盲辨证的四路，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 7;
const SLUG = '07-qingguangyan-shishenjing';
const TITLE = '绿风内障与视神经：唯一不能「先辨证再看看」的病';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['绿风内障', '五风变内障', '玄府', '神水', '青盲', '虹视', '视神经萎缩', '眼压'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '瞳神气浊而不清',
  '玄府',
  '不滴散瞳药、不按压眼球',
  '防复发',
  '视神经萎缩之后',
  '宁可白转一次',
];

/** 青盲辨证的四路（顺序即正文顺序） */
const BLIND_ROUTES = ['肝肾亏虚', '气血两虚', '肝气郁结', '气滞血瘀'];

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

/** 某节里以「**……**」开头的条目 */
function boldLeads(sectionBody) {
  const out = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\*\*(.+?)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。.]$/, ''));
  }
  return out;
}

/** 发作期的三个动作：第三节的粗体条目「第一动作：转诊」等 */
const threeSteps = (text) => boldLeads(sectionAt(text, 2));

/** 常见诱因：正文「常见诱因有甲、乙……」一句 */
function triggers(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('常见诱因有')) || '';
  const tail = (/常见诱因有(.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
}

/** 典型发作的症状：正文「一组症状的合奏：……」一句 */
function attackSymptoms(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('一组症状的合奏')) || '';
  const tail = (/合奏[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail
    .split(/[、，,]/)
    .map((s) => s.replace(/^常伴/, '').trim())
    .filter(Boolean);
}

/** 青盲辨证四路：正文「青盲的辨证分四路：……」一句 */
function blindRoutes(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('辨证分四路')) || '';
  const tail = (/分四路[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
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
    steps: threeSteps(text),
    triggers: triggers(text),
    symptoms: attackSymptoms(text),
    routes: blindRoutes(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医眼科学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables} 个（本章以段落组织）`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`发作期的三个动作（正文现算，${r.steps.length} 步，次序不可颠倒）：`);
  r.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('');
  console.log(`常见诱因（正文现算，${r.triggers.length} 条）：${r.triggers.join(' / ')}`);
  console.log('');
  console.log(`典型发作的症状（正文现算，${r.symptoms.length} 项）：`);
  console.log('  ' + r.symptoms.join(' · '));
  console.log('');
  console.log(`青盲辨证的四路（正文现算，${r.routes.length} 路）：${r.routes.join(' / ')}`);
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊断、处方或手术建议；目胀痛伴头痛恶心、虹视、视力骤降者先转诊。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  boldLeads,
  threeSteps,
  triggers,
  attackSymptoms,
  blindRoutes,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  BLIND_ROUTES,
};
