#!/usr/bin/env node
/**
 * 中药炮制学 · 第 4 章 炙法与酒醋蜜盐的辅料
 *
 *   node code/main.js
 *
 * 正文：chapters/04-zhifa-fuliao/docs/zh.md
 * 习题：chapters/04-zhifa-fuliao/quiz.json
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

const CHAPTER = 4;
const SLUG = '04-zhifa-fuliao';
const TITLE = '炙法与酒醋蜜盐的辅料';

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

/** 节的序号（一、二、…），即本章的单元键 */
const KEYS = sections(readDoc()).map((s) => s.split('、')[0]);

/* ── 本章取词（逐章注入，正文里数的就是这些词） ───────────────── */

const TERMS = ["炙","辅料","酒炙","醋炙","盐炙","姜炙","蜜炙","闷润","药性","引药","药典","减毒"];
const OPS = ["炙","炒","煮","蒸","润","拌","炼"];

const sum = (dict) => Object.values(dict).reduce((a, b) => a + b, 0);

/** 每节 = 一个「单元」：标题、正文、词频与数字命中 */
function chapterUnits(data) {
  const d = data && data.doc ? data.doc : readDoc();
  return sectionBodies(d).map((s, i) => {
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

function load() {
  return { doc: readDoc(), quiz: JSON.parse(fs.readFileSync(QUIZ, 'utf8')) };
}

function merge(list, field) {
  const out = {};
  for (const u of list) {
    const src = (u.measure && u.measure[field]) || {};
    if (typeof src === 'number') { out[field] = (out[field] || 0) + src; continue; }
    for (const [k, v] of Object.entries(src)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .filter(([, v]) => v)
    .map(([key, cnt]) => ({ key, count: cnt, share: tot ? cnt / tot : 0 }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'zh'));
}

/** 按节分组：节序、单元数、汉字数 */
function byBookSection(list) {
  const out = new Map();
  for (const u of list) {
    const key = '第' + u.sub + '节';
    const it = out.get(key) || { sec: key, title: u.title, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

/** 正文里《书名》的出现次数与部数 */
function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
  }
  const books = [...counter.values()].reduce((a, b) => a + b, 0);
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  return { books: counter.size, total: books, top: ranked.slice(0, 3) };
}

/** 规模：单元数、汉字、均字、数字命中、数字字符 */
function shape(list) {
  const hanziSum = list.reduce((a, u) => a + u.hanzi, 0);
  return {
    units: list.length,
    hanzi: hanziSum,
    mean: list.length ? Math.round(hanziSum / list.length) : 0,
    valueLike: list.reduce((a, u) => a + u.measure.valueLike, 0),
    digits: list.reduce((a, u) => a + u.measure.digits, 0),
  };
}

/** 操作词命中：本章涉及的炮制动作在正文里各出现几次 */
function hands(list) {
  return OPS.map((w) => [w, list.reduce((a, u) => a + count(u.prose, w), 0)])
    .filter(([, c]) => c)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

function analyze() {
  const data = load();
  const doc = data.doc;
  const ts = tables(doc);
  const list = chapterUnits(data);
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    units: list,
    terms: rank(merge(list, 'terms')),
    ops: hands(list),
    cites: citations(list),
    shape: shape(list),
    quiz: quizSummary(data.quiz, doc),
  };
}

function main() {
  const r = analyze();
  const s = r.shape;
  console.log('中药炮制学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个');
  console.log('');
  console.log('结构：');
  for (const sec of r.sections) console.log('  ' + sec);
  console.log('');
  console.log('表 ' + r.tables.length + ' 张：');
  r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  console.log('');
  console.log('逐节规模（节序 / 汉字）：');
  for (const sec of byBookSection(r.units)) console.log('  ' + sec.sec + ' ' + sec.title + '  ' + sec.hanzi + ' 字');
  console.log('');
  console.log('判据词频（正文里数的，不是手打）：');
  for (const t of r.terms.slice(0, 8)) console.log('  ' + t.key + '\\t' + t.count);
  console.log('');
  console.log('操作词命中：' + (r.ops.length ? r.ops.map(([w, k]) => w + '×' + k).join('  ') : '（本章无操作词）'));
  console.log('引书 ' + r.cites.books + ' 部 · 引用 ' + r.cites.total + ' 次' + (r.cites.top.length ? ' · 前三：' + r.cites.top.map(([n, k]) => n + '(' + k + ')').join('、') : ''));
  console.log('单元 ' + s.units + ' · 汉字 ' + s.hanzi + ' · 平均 ' + s.mean + ' 字/节 · 数字命中 ' + s.valueLike + ' 处 / ' + s.digits + ' 个数字字符');
  console.log('');
  console.log('quiz ' + r.quiz.total + ' 题（pre ' + r.quiz.stage.pre + ' / check ' + r.quiz.stage.check + ' / post ' + r.quiz.stage.post + '）· 答案 ' + r.quiz.answers.join('/'));
  console.log('  check 题接地 ' + r.quiz.checkGrounded + ' 道 · 答案落在 ' + r.quiz.distinctAnswers + ' 个位置 · 解释 ' + r.quiz.minExplain + '–' + r.quiz.maxExplain + ' 汉字');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为中药炮制学教学材料，不构成工艺参数与生产规范；实际生产、检验与临床用药以现行《中国药典》炮制通则与各省炮制规范为准。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, KEYS, TERMS, OPS, DOC, QUIZ,
  load, chapterUnits, merge, rank, byBookSection, citations, shape, hands, sum,
  readDoc, sections, paragraphs, tables, tableBy, sectionBodies, grams, hanzi, count, nums, quizSummary, analyze,
};
