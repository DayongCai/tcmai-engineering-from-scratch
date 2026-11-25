#!/usr/bin/env node
/**
 * 人体解剖学 · 第 2 章 运动系统不是「一堆骨头的名字」，而是一套受力与杠杆的分工
 *
 *   node code/main.js
 *
 * 课程：departments/09-jichu/01-renti-jiepou-xue/chapters/02-yundong-xitong/docs/zh.md
 * 正文：docs/zh.md
 * 习题：quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章习题，不读任何外部取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：节规模求和、术语命中、枚举词计数，全部现算
 *   · quiz 体检：题量、三段分布、选项数、解释长度、答案分布、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-yundong-xitong';
const TITLE = "运动系统不是「一堆骨头的名字」，而是一套受力与杠杆的分工";

/** 本章关注的解剖学名词。计数只说明正文覆盖，不构成任何判断。 */
const TERMS = ["骨密质","骨松质","骨膜","椎间孔","胸骨角","关节面","关节囊","关节腔","肌腱袖","半月板","籽骨"];
/** 正文里成组出现的枚举词。 */
const ENUMS = ["四类","三条","两类"];

/* ── 文本口径 ────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split('\n');

/** 节标题：`## 一、…` */
function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 每节汉字数：按 `## ` 切块，标题行不计。 */
function sectionSizes(doc) {
  const parts = String(doc).split(/^##\s+/m).slice(1);
  return parts.map((p) => {
    const nl = p.indexOf('\n');
    const head = (nl < 0 ? p : p.slice(0, nl)).trim();
    const body = nl < 0 ? '' : p.slice(nl + 1);
    return { head: head, hanzi: hanzi(body) };
  });
}

/** 段：非空，不以标题、引文、表格行、清单符号、编号或代码围栏起始 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|`]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) {
        block.push(ls[i]);
        i += 1;
      }
      const header = cells(block[0]);
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header: header, cols: header.length, rows: rows });
    } else {
      i += 1;
    }
  }
  return out;
}

/** 正文里 n 字以上的连续汉字片段 */
function grams(text, n) {
  const size = n || 4;
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + size <= seg.length; i += 1) out.add(seg.slice(i, i + size));
  }
  return out;
}

/* ── quiz 体检 ──────────────────────────────────────────────── */

function quizSummary(quiz, doc) {
  const body = grams(doc, 4);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right, 4)].filter((g) => body.has(g));
    const stemHit = [...grams(q.question, 4)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded: hit.length,
      stemGrounded: stemHit.length,
      sample: hit.slice(0, 2),
    };
  });
  return {
    total: qs.length,
    stage: stage,
    items: items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    stemGrounded: items.filter((x) => x.stemGrounded > 0).length,
    minExplain: items.length ? Math.min.apply(null, items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ──────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const secs = sectionSizes(doc);
  const ps = paragraphs(doc);
  const ts = tables(doc);
  const total = hanzi(doc);
  const secSum = secs.reduce((s, x) => s + x.hanzi, 0);
  const termHits = TERMS.map((t) => [t, count(doc, t)]);
  const enumHits = ENUMS.map((t) => [t, count(doc, t)]);
  return {
    doc: doc,
    total: total,
    paragraphs: ps.length,
    sections: sections(doc),
    secs: secs,
    secSum: secSum,
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    cells: ts.reduce((s, t) => s + t.cols * t.rows.length, 0),
    termHits: termHits,
    hitTerms: termHits.filter((x) => x[1] > 0).length,
    enumHits: enumHits,
    enumSum: enumHits.reduce((s, x) => s + x[1], 0),
    quiz: quizSummary(quiz, doc),
  };
}

function issuesOf(r) {
  const q = r.quiz;
  const out = [];
  if (q.total < 6) out.push('题量 ' + q.total + ' < 6');
  if (!q.stageComplete) out.push('pre/check/post 未齐');
  if (!q.allFourOptions) out.push('有题不是 4 个选项');
  if (q.badCorrect) out.push(q.badCorrect + ' 题 correct 非法');
  if (q.minExplain < 30) out.push('最短解释 ' + q.minExplain + ' 汉字 < 30');
  if (q.checkGrounded < 2) out.push('check 接地 ' + q.checkGrounded + ' < 2');
  if (r.hitTerms < Math.ceil(TERMS.length * 0.6)) out.push('术语命中 ' + r.hitTerms + '/' + TERMS.length + ' 偏低');
  return out;
}

function main() {
  const r = analyze();
  const q = r.quiz;
  console.log('人体解剖学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.total.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张');
  console.log('节规模求和 ' + r.secSum.toLocaleString('en-US') + ' 汉字（与全文差 ' + (r.total - r.secSum) + '，差值在标题、表格与清单行）');
  console.log('');
  console.log('节与规模：');
  for (const s of r.secs) console.log('  ' + s.head + '  ' + s.hanzi + ' 汉字');
  console.log('');
  if (r.tables.length) {
    console.log('表 ' + r.tables.length + ' 张 · 合计 ' + r.cells + ' 个单元格：');
    r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
    console.log('');
  }
  console.log('术语命中 ' + r.hitTerms + '/' + TERMS.length + '：');
  console.log('  ' + r.termHits.map((x) => x[0] + ' ' + x[1]).join(' · '));
  console.log('枚举词 ' + r.enumHits.length + ' 个，合计出现 ' + r.enumSum + ' 次：');
  console.log('  ' + r.enumHits.map((x) => x[0] + ' ×' + x[1]).join(' · '));
  console.log('');
  console.log('quiz ' + q.total + ' 题（pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post + '）· 答案 ' + q.answers.join('/'));
  console.log('  check 接地 ' + q.checkGrounded + ' 道 · 题干接地 ' + q.stemGrounded + ' 道 · 答案落在 ' + q.distinctAnswers + ' 个位置 · 最短解释 ' + q.minExplain + ' 汉字');
  q.items.forEach((x) => {
    console.log('  [' + x.n + '] ' + x.stage + ' · 选项 ' + x.options + ' · 答案 ' + x.correct + ' · 解释 ' + x.explainHanzi + ' 汉字 · 接地 ' + x.grounded + (x.sample.length ? '（' + x.sample.join('／') + '）' : ''));
  });
  console.log('');
  const issues = issuesOf(r);
  if (issues.length) {
    for (const s of issues) console.log('× ' + s);
  } else {
    console.log('√ 结构自洽：题量、三段分布、选项数、答案、解释长度与 check 接地全部通过。');
  }
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，描述口径与分类均取教材约定，不构成诊疗建议，也不替代执业人员的判断。');
}

if (require.main === module) main();

module.exports = {
  analyze: analyze,
  readDoc: readDoc,
  sections: sections,
  sectionSizes: sectionSizes,
  paragraphs: paragraphs,
  tables: tables,
  grams: grams,
  hanzi: hanzi,
  count: count,
  quizSummary: quizSummary,
  CHAPTER: CHAPTER,
  SLUG: SLUG,
  TITLE: TITLE,
  DOC: DOC,
  QUIZ: QUIZ,
};
