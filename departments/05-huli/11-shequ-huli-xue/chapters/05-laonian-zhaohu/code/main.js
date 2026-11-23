'use strict';
/**
 * 社区护理学 · 第 5 章 照护失能老人，先算清「哪几件事他做不了」，再谈人力
 *
 *   node code/main.js
 *
 * 正文：chapters/05-laonian-zhaohu/docs/zh.md（唯一数据源）
 * 习题：chapters/05-laonian-zhaohu/quiz.json
 *
 * 本章每个数字都由正文现算，不手打：
 *   · 规模：汉字、段落、二级小节、被引书名次数
 *   · 结构：判据表的张数与数据行、失效条数、边界条数与分句数
 *   · 自称之数对读：正文说「几个字段」「几条边界」，就数一遍是不是这个数
 *   · 关键词在正文里的出现次数（本章论证靠它们）
 *   · 习题结构与接地：check 题的正确项能不能在正文找到原词
 * 正文一改，重跑就能看出哪一行对不上。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 5;
const SLUG = '05-laonian-zhaohu';
const TITLE = '照护失能老人，先算清「哪几件事他做不了」，再谈人力';
const TERMS = ["介入","照护者"];
const NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const countTerm = (doc, term) => String(doc).split(term).length - 1;

/* ── 正文结构 ────────────────────────────────────────────────────── */

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');

function sections(doc) {
  return String(doc)
    .split(/\r?\n/)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 某一小节（## 标题含 keyword）的正文，到下一个 ## 为止 */
function sectionText(doc, keyword) {
  const lines = String(doc).split(/\r?\n/);
  const i = lines.findIndex((l) => /^##\s+/.test(l) && l.includes(keyword));
  if (i < 0) return '';
  const out = [];
  for (let j = i + 1; j < lines.length; j += 1) {
    if (/^##\s+/.test(lines[j])) break;
    out.push(lines[j]);
  }
  return out.join('\n');
}

/** 小节里的加粗项（去重，按出现顺序） */
function boldItems(text) {
  const seen = new Set();
  const out = [];
  for (const m of String(text).matchAll(/\*\*([^*]{2,26})\*\*/g)) {
    const t = m[1].trim();
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}

function tables(doc) {
  const out = [];
  let cur = [];
  for (const l of String(doc).split(/\r?\n/)) {
    if (/^\s*\|/.test(l)) cur.push(l);
    else if (cur.length) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

const tableCount = (doc) => tables(doc).length;
/** 表格数据行：去掉表头与分隔行 */
const tableRows = (doc) => tables(doc).reduce((a, t) => a + Math.max(0, t.length - 2), 0);

/** 失效条数：小节里「其一／其二／其三」的加粗小标题 */
const failures = (doc) => (String(doc).match(/\*\*其[一二三四]/g) || []).length;

/** 边界：正文自称「边界N条：…；…；…；…。」，数出分句 */
function boundaries(doc) {
  const m = /边界([一二三四五])条：([^。]+。)/.exec(String(doc));
  if (!m) return { declared: 0, clauses: 0 };
  // 分句：多数章用「；」，少数章用「，」，两种都要能数
  const raw = m[2].split('；').map((s) => s.trim()).filter(Boolean);
  const clauses = raw.length > 1 ? raw : m[2].split('，').map((s) => s.trim()).filter(Boolean);
  return {
    declared: NUM[m[1]] || 0,
    clauses: clauses.length,
  };
}

/** 每张表：列数、行数、列数与表头不一致的行数（正文自洽性） */
function tableShape(doc) {
  const cols = (l) => l.split('|').length - 2;
  return tables(doc).map((t, i) => {
    const head = cols(t[0]);
    const rows = t.slice(2);
    return {
      index: i + 1,
      head: t[0].trim().slice(0, 40),
      cols: head,
      rows: rows.length,
      ragged: rows.filter((l) => cols(l) !== head).length,
    };
  });
}

/* ── 正文画像 ────────────────────────────────────────────────────── */

function profile(doc) {
  const t = String(doc);
  const blocks = t.split(/\r?\n\s*\r?\n/).map((s) => s.trim()).filter(Boolean);
  const prose = blocks.filter((b) => !b.startsWith('|') && !b.startsWith('#') && !b.startsWith('>') && !b.startsWith('-'));
  return {
    hanzi: hanzi(t),
    blocks: blocks.length,
    paragraphs: prose.length,
    sections: sections(t),
    tables: tableCount(t),
    tableRows: tableRows(t),
    books: new Set([...t.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size,
    quotes: (t.match(/《[^》]+》/g) || []).length,
  };
}

/* ── 习题：结构与接地 ────────────────────────────────────────────── */

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded: hit.length,
      hit: hit.slice(0, 3),
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: Math.min(...items.map((x) => x.explainHanzi)),
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

/* ── 汇总 ────────────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const prof = profile(doc);
  const b = boundaries(doc);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    profile: prof,
    failures: failures(doc),
    boundaries: b,
    tables: tableShape(doc),
    proseSections: prof.sections.filter((s) => !s.startsWith('代价与边界')),
    terms: TERMS.map((t) => ({ term: t, n: countTerm(doc, t) })),
    tableHeads: tables(doc).map((t) => t[0]),
    quiz: quizSummary(quiz, doc),
  };
}

/* ── 输出 ────────────────────────────────────────────────────────── */

function main() {
  const r = analyze();
  const p = r.profile;
  console.log(`${r.chapter === 0 ? '' : ''}${r.title}`);
  console.log(`正文 ${p.hanzi.toLocaleString('en-US')} 汉字 · ${p.paragraphs} 段 · ${p.sections.length} 个二级小节 · 表 ${p.tables} 张 / ${p.tableRows} 行`);
  console.log(`被引 ${p.books} 部书 / ${p.quotes} 处`);
  console.log('');
  console.log('小节：');
  for (const s of p.sections) console.log(`  · ${s}`);
  console.log('');
  console.log(`三种失效：${r.failures} 条（正文自称三种）`);
  console.log(`边界：自称 ${r.boundaries.declared} 条 / 实写 ${r.boundaries.clauses} 个分句`);
  if (r.tables.length) {
    console.log('判据表（列数 / 数据行 / 列数不齐的行）：');
    for (const t of r.tables) console.log(`  表 ${t.index} ${t.cols} 列 / ${t.rows} 行 / 不齐 ${t.ragged}`);
  }
  console.log('');
  console.log('关键词（本章论证靠它们）：');
  for (const t of r.terms) console.log(`  「${t.term}」${t.n} 处`);
  console.log('');
  const q = r.quiz;
  console.log(`习题 ${q.total} 题（pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}）`);
  console.log(`  四选项齐：${q.allFourOptions ? '是' : '否'} · 最短解释 ${q.minExplain} 汉字 · 答案分布 ${q.answers.join('/')}`);
  console.log(`  check 题接地 ${q.checkGrounded} 道：`);
  q.items.forEach((x, i) => {
    if (x.stage === 'check') console.log(`    第 ${i + 1} 题 ${x.grounded > 0 ? '✓' : '✗'} ${x.hit.join('、')}`);
  });
  console.log('');
  console.log('※ 以上数字全部由本章正文与 quiz.json 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊断、治疗或处置建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  profile,
  sections,
  sectionText,
  boldItems,
  tables,
  tableCount,
  tableRows,
  failures,
  boundaries,
  tableShape,
  countTerm,
  grams,
  quizSummary,
  hanzi,
  readDoc,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
