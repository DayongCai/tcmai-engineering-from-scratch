#!/usr/bin/env node
/**
 * 中药药代动力学 · 第 7 章 中药复方药动学特点
 *
 *   node code/main.js
 *
 * 正文：chapters/07-fufang-tedian/docs/zh.md
 * 习题：chapters/07-fufang-tedian/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文里数判据词、操作词、引书与数字，再算派生量
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 7;
const SLUG = '07-fufang-tedian';
const TITLE = '复方的暴露是一条谱，不是一个点';

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const nums = (s) => (String(s || '').match(/\d+(?:\.\d+)?/g) || []);
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 节标题：二级标题行，形如「## 一、…」 */
function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 段：非空，不以标题、引文、表格行、清单符号或编号起始，且不含表格竖线 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行；围栏代码块里的竖线不算表 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  let fenced = false;
  while (i < ls.length) {
    if (/^\s*\x60\x60\x60/.test(ls[i])) { fenced = !fenced; i += 1; continue; }
    if (!fenced && /^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) { block.push(ls[i]); i += 1; }
      const header = cells(block[0]);
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header, cols: header.length, rows });
    } else { i += 1; }
  }
  return out;
}

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/** 一节一段正文：标题行之后的连续文本，到下一个同级标题为止 */
function sectionBodies(doc) {
  const ls = docLines(doc);
  const out = [];
  let cur = null;
  for (const line of ls) {
    if (/^##\s+/.test(line)) {
      if (cur) out.push(cur);
      cur = { title: line.replace(/^##\s+/, '').trim(), lines: [] };
    } else if (/^#\s+/.test(line)) {
      if (cur) { out.push(cur); cur = null; }
    } else if (cur) cur.lines.push(line);
  }
  if (cur) out.push(cur);
  return out.map((s) => ({ title: s.title, prose: s.lines.join('\n') }));
}

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** quiz 结构 + 接地 + 解释长度 */
function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded: hit.length,
      sample: hit.slice(0, 3),
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    maxExplain: items.length ? Math.max(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

const CHAPTER_TITLE = '中药药代动力学 第 ' + CHAPTER + ' 章 · ' + TITLE;

/* ── 本章取词（逐章注入，正文里数的就是这些词） ───────────────── */

const TERMS = ["复方","成分","暴露","配伍","标志物","拆方","剂量","基质","药效","君臣","转运","采样"];

/** 节序 → 单元键 */
function chapterKeys() {
  return sectionBodies(readDoc()).map((_, i) => String(i + 1));
}

/** 每节 = 一个「单元」：标题、正文、词频与数字命中 */
function chapterUnits() {
  return sectionBodies(readDoc()).map((s, i) => {
    const terms = {};
    for (const w of TERMS) terms[w] = count(s.prose, w);
    return {
      sub: String(i + 1),
      title: s.title,
      hanzi: hanzi(s.prose),
      prose: s.prose,
      measure: { terms, valueLike: nums(s.prose).length, digits: (s.prose.match(/\d/g) || []).length },
    };
  });
}

function summarize(units) {
  const terms = {};
  const books = new Map();
  let hanziSum = 0;
  let values = 0;
  let digits = 0;
  for (const u of units) {
    hanziSum += u.hanzi;
    values += (u.measure && u.measure.valueLike) || 0;
    digits += (u.measure && u.measure.digits) || 0;
    for (const [k, v] of Object.entries((u.measure && u.measure.terms) || {})) terms[k] = (terms[k] || 0) + v;
    for (const m of (u.prose || '').matchAll(/《([^》]+)》/g)) books.set(m[1], (books.get(m[1]) || 0) + 1);
  }
  const ranked = Object.entries(terms).filter(([, v]) => v).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  const citeTop = [...books.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  return {
    units: units.length,
    hanzi: hanziSum,
    mean: units.length ? Math.round(hanziSum / units.length) : 0,
    values,
    digits,
    terms,
    ranked,
    top: ranked[0] || ['—', 0],
    books: books.size,
    cites: [...books.values()].reduce((a, b) => a + b, 0),
    citeTop: citeTop.slice(0, 3),
  };
}

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const units = chapterUnits();
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    units,
    sum: summarize(units),
    quiz: quizSummary(JSON.parse(fs.readFileSync(QUIZ, 'utf8')), doc),
  };
}

function main() {
  const r = analyze();
  const s = r.sum;
  console.log(CHAPTER_TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个');
  console.log('');
  console.log('结构：');
  for (const sec of r.sections) console.log('  ' + sec);
  console.log('');
  console.log('表 ' + r.tables.length + ' 张：');
  r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  console.log('');
  console.log('逐节规模（节序 / 汉字）：');
  for (const u of r.units) console.log('  ' + u.sub + ' ' + u.title + '  ' + u.hanzi + ' 字');
  console.log('');
  console.log('判据词频（正文里数的，不是手打）：');
  for (const [k, v] of s.ranked.slice(0, 8)) console.log('  ' + k + '\\t' + v);
  console.log('  → 最高一项：' + s.top[0] + '（' + s.top[1] + '）');
  console.log('');
  console.log('引书 ' + s.books + ' 部 · 引用 ' + s.cites + ' 次' + (s.citeTop.length ? ' · 前三：' + s.citeTop.map(([n, k]) => n + '(' + k + ')').join('、') : ''));
  console.log('单元 ' + s.units + ' · 汉字 ' + s.hanzi + ' · 平均 ' + s.mean + ' 字/节 · 数字命中 ' + s.values + ' 处 / ' + s.digits + ' 个数字字符');
  console.log('');
  console.log('quiz ' + r.quiz.total + ' 题（pre ' + r.quiz.stage.pre + ' / check ' + r.quiz.stage.check + ' / post ' + r.quiz.stage.post + '）· 答案 ' + r.quiz.answers.join('/'));
  console.log('  check 题接地 ' + r.quiz.checkGrounded + ' 道 · 答案落在 ' + r.quiz.distinctAnswers + ' 个位置 · 解释 ' + r.quiz.minExplain + '–' + r.quiz.maxExplain + ' 汉字');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，所列判据与分档均为课堂约定，不构成用药与生产参数；实际以现行规范与机构制度为准。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, TERMS, DOC, QUIZ,
  chapterKeys, chapterUnits, summarize, analyze,
  readDoc, sections, paragraphs, tables, tableBy, sectionBodies, grams, hanzi, count, nums, quizSummary,
};
