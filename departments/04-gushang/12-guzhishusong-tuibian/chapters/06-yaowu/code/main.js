#!/usr/bin/env node
/**
 * 骨质疏松与退行性疾病 · 第 6 章 · 抗骨质疏松药不改「骨头的年龄」，只改斜率
 * 课程: departments/04-gushang/12-guzhishusong-tuibian/chapters/06-yaowu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从本章正文现算，不手打：
 *   汉字数、小节标题与顺序、表格数、加粗的承重断言、引文与部数、
 *   边界条目数，以及 quiz 的 check 题能在正文里对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-yaowu';
const TITLE = '抗骨质疏松药不改「骨头的年龄」，只改斜率';

/** 本章表格张数（现算结果，供测试对照） */
const TABLE_COUNT = 0;

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ["抗骨吸收","促骨形成","双膦酸盐","地舒单抗","序贯","药物假期","骨转换标志物","颌骨坏死"];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = ["近期骨折的概率","两条主线","持续的暴露","监测","非药物那半边","不给任何药物名称背后的剂量"];

/** 承重断言的最小长度（汉字）：短于此的多是分句小标题，不算断言 */
const CLAIM_MIN = 8;

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

/** 按二级标题切段，返回 [{ title, body }]；body 含标题行本身 */
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

/** 表格：连续以 | 开头的行成块 */
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
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((x) => x.trim()));
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

/** 引文：《书名·篇名》的出现次数与去重后的部数 */
function citations(text) {
  const all = [...String(text).matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { count: all.length, books: [...new Set(all)] };
}

/** 加粗的承重断言：跳过引用块与「双根因定位」行，只留够长的句子 */
function boldClaims(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const s = line.trim();
    if (s.startsWith('>')) continue;
    if (/^\*\*双根因定位/.test(s)) continue;
    for (const m of s.matchAll(/\*\*([^*]+)\*\*/g)) {
      const span = m[1].trim();
      if (hanzi(span) >= CLAIM_MIN) out.push(span);
    }
  }
  return out;
}

/** 「代价与边界」一节的条目数 */
function boundaryItems(text) {
  const sec = h2Sections(text).find((s) => s.title.includes('代价与边界'));
  if (!sec) return -1;
  return sec.body.split(/\r?\n/).filter((l) => /^-\s+/.test(l.trim())).length;
}

/** quiz 的结构与接地情况：check 题的正确选项能对上几个四字原词 */
function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    return { question: q.question, grams: [...new Set([...grams(right)].filter((g) => body.has(g)))] };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    rich: hits.filter((h) => h.grams.length >= 2).length,
    hits,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const cit = citations(text);
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).length,
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    claims: boldClaims(text),
    boundaries: boundaryItems(text),
    citations: cit,
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨质疏松与退行性疾病 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`引文 ${r.citations.count} 次，涉及 ${r.citations.books.length} 篇：`);
  r.citations.books.forEach((b) => console.log(`  《${b}》`));
  console.log('');
  console.log(`承重断言 ${r.claims.length} 条（加粗且不少于 ${CLAIM_MIN} 汉字）：`);
  r.claims.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`边界条目 ${r.boundaries} 条（「代价与边界」一节）。`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道 / 其中带两个以上原文词组 ${r.quiz.rich} 道`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  citations,
  boldClaims,
  boundaryItems,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_COUNT,
  TERMS,
  SECTION_PROBES,
  CLAIM_MIN,
};
