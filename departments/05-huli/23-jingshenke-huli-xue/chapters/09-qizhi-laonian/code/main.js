#!/usr/bin/env node
/**
 * 精神科护理学 · 第 9 章 器质性与老年精神障碍的护理：本章正文的现算口径
 * 正文: chapters/09-qizhi-laonian/docs/zh.md（唯一数据源；不读 standards，不引外部文件）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章每个数字都从正文逐行读出：汉字、节、表、段、算术式，以及 quiz 的结构与接地。
 * 正文一改，重跑就能看出是哪一格对不上 —— 手打的数字会静默过期，现算的不会。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 9;
const SLUG = '09-qizhi-laonian';
const TITLE = '器质性与老年精神障碍的护理';

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HAN) || []).length;
const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const splitLines = (doc) => String(doc).split(/\r?\n/);

const isHeading = (l) => /^#{1,6}\s+/.test(l);
const isTableRow = (l) => /^\s*\|/.test(l);
const isQuote = (l) => /^\s*>/.test(l);
const isBlank = (l) => !String(l).trim();

/** 节：## 标题；每节带本节汉字、段数、表数 */
function sections(doc) {
  const ls = splitLines(doc);
  const out = [];
  let cur = null;
  let buf = [];
  const flush = () => {
    if (!cur) return;
    const body = buf.join('\n');
    cur.hanzi = hanzi(body) + hanzi(cur.title);
    cur.paragraphs = paragraphs(body).length;
    cur.tables = tables(body).length;
    out.push(cur);
    cur = null;
    buf = [];
  };
  for (const l of ls) {
    const m = /^##\s+(.+)$/.exec(l);
    if (m) {
      flush();
      cur = { no: out.length + 1, title: m[1].trim() };
      continue;
    }
    if (cur) buf.push(l);
  }
  flush();
  return out;
}

/** 表格：连续的表格行块里，第二行是分隔行（|---|）的算一张表 */
const isSeparator = (l) => /^\s*\|?\s*:?-{2,}/.test(l) && /\|/.test(l);

function tables(doc) {
  const ls = splitLines(doc);
  const out = [];
  let block = [];
  const flush = () => {
    if (block.length >= 2 && isSeparator(block[1])) {
      const header = block[0];
      out.push({
        header: header.trim(),
        cols: header.split('|').filter((c) => c.trim()).length,
        rows: block.length - 2,
        firstCell: (header.split('|')[1] || '').trim(),
      });
    }
    block = [];
  };
  for (const l of ls) {
    if (isTableRow(l)) block.push(l);
    else flush();
  }
  flush();
  return out;
}

/** 段：非空、非标题、非表行、非引用行的连续文本行块 */
function paragraphs(doc) {
  const out = [];
  let buf = [];
  const flush = () => {
    const text = buf.join('\n').trim();
    if (text) out.push({ text, hanzi: hanzi(text) });
    buf = [];
  };
  for (const l of splitLines(doc)) {
    if (isBlank(l) || isHeading(l) || isTableRow(l) || isQuote(l)) flush();
    else buf.push(l);
  }
  flush();
  return out;
}

/** 章首：第一个 ## 之前的标题、题解与双根因定位（不计入节） */
function preamble(doc) {
  const ls = splitLines(doc);
  const i = ls.findIndex((l) => /^##\s+/.test(l));
  const head = i < 0 ? doc : ls.slice(0, i).join('\n');
  return { hanzi: hanzi(head), paragraphs: paragraphs(head).length };
}

/** 算术式：正文里写成 a × b = c 的句子，逐条求值，求不出就标 ✗ */
const OPS = { '×': (a, b) => a * b, x: (a, b) => a * b, X: (a, b) => a * b, '*': (a, b) => a * b,
  '＋': (a, b) => a + b, '+': (a, b) => a + b, '−': (a, b) => a - b, '-': (a, b) => a - b };

function equations(doc) {
  const re = /(\d+(?:\.\d+)?)\s*([×xX*＋+\-−])\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g;
  const out = [];
  for (const m of String(doc).matchAll(re)) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    const want = Number(m[4]);
    const got = OPS[m[2]](a, b);
    out.push({ text: m[0], a, op: m[2], b, got: Math.round(got * 100) / 100, want, ok: Math.abs(got - want) < 1e-9 });
  }
  return out;
}

/** 引书：正文里出现的《…》逐条去重 */
function citations(doc) {
  const names = [...String(doc).matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { count: names.length, distinct: [...new Set(names)] };
}

function stats(doc = readDoc()) {
  const secs = sections(doc);
  const tabs = tables(doc);
  const paras = paragraphs(doc);
  const eqs = equations(doc);
  const total = hanzi(doc);
  return {
    hanzi: total,
    sections: secs,
    sectionCount: secs.length,
    tables: tabs,
    tableCount: tabs.length,
    tableRows: tabs.reduce((a, t) => a + t.rows, 0),
    paragraphs: paras,
    paragraphCount: paras.length,
    preamble: preamble(doc),
    equations: eqs,
    citation: citations(doc),
    avgHanziPerSection: secs.length ? Math.round(total / secs.length) : 0,
    avgHanziPerParagraph: paras.length ? Math.round(total / paras.length) : 0,
  };
}

/** 正文里的连续汉字片段，用来判断一道题的正确选项是否真的落在正文里 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const SCAFFOLD = new RegExp(['三' + '辨', '四位' + '面', '单元' + '规模', '本章' + '实测', '本课第' + String.fromCharCode(92) + 's*' + String.fromCharCode(92) + 'd+' + String.fromCharCode(92) + 's*章'].join('|'));

function quizAudit(raw = fs.readFileSync(QUIZ, 'utf8'), doc = readDoc()) {
  const quiz = JSON.parse(raw);
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const rows = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      right,
      grounded: hit.length,
      hit,
    };
  });
  return {
    total: qs.length,
    stage,
    rows,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    allFourOptions: rows.every((r) => r.options === 4),
    badCorrect: rows.filter((r) => !(Number.isInteger(r.correct) && r.correct >= 0 && r.correct < 4)).length,
    minExplain: rows.length ? Math.min(...rows.map((r) => r.explainHanzi)) : 0,
    checkGrounded: rows.filter((r) => r.stage === 'check' && r.grounded > 0).length,
    scaffold: SCAFFOLD.test(raw),
  };
}

function main() {
  const s = stats();
  const q = quizAudit();
  console.log(`精神科护理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${s.hanzi.toLocaleString('en-US')} 汉字 · ${s.sectionCount} 节 · ${s.tableCount} 张表（${s.tableRows} 行）· ${s.paragraphCount} 段`);
  console.log(`节均 ${s.avgHanziPerSection} 字 · 段均 ${s.avgHanziPerParagraph} 字`);
  console.log('');
  console.log('逐节：');
  for (const sec of s.sections) {
    console.log(`  ${sec.no}. ${sec.title} —— ${sec.hanzi} 字 · ${sec.paragraphs} 段 · ${sec.tables} 表`);
  }
  console.log('');
  console.log(`算术式 ${s.equations.length} 条：`);
  for (const e of s.equations) console.log(`  ${e.ok ? '✓' : '✗'} ${e.text}（现算 ${e.got}）`);
  if (!s.equations.length) console.log('  （本章没有 a × b = c 形式的算式）');
  console.log('');
  console.log(`引书 ${s.citation.count} 次 / ${s.citation.distinct.length} 部：${s.citation.distinct.join('、') || '无'}`);
  console.log('');
  console.log(`quiz ${q.total} 题（pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}）· check 接地 ${q.checkGrounded} 道 · 答案 ${q.answers.join('/')}`);
  console.log('※ 数字全部由本章正文现算，改正文后重跑即可复核；本输出为教学材料，不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  hanzi,
  readDoc,
  sections,
  tables,
  paragraphs,
  preamble,
  equations,
  citations,
  stats,
  grams,
  quizAudit,
};
