#!/usr/bin/env node
/**
 * 急救护理学 · 第 16 章 灾难与群体伤害的急救护理
 *
 *   node code/main.js
 *
 * 正文：chapters/16-zainan-qunti/docs/zh.md
 * 习题：chapters/16-zainan-qunti/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 这一章只做一件事：把正文当数据读一遍，数字全部现算。
 *   · 规模：段落数、汉字数、平均每段汉字（段＝直接陈述的散文行，不含标题、表格、清单、引文）
 *   · 结构：节的标题、表格张数与每张表的列数／行数
 *   · 判据词频：本章反复用到的判据词各出现多少次
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 正文一改，重跑就能看出是哪一行对不上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 16;
const SLUG = '16-zainan-qunti';
const TITLE = '群体伤害的分诊不是选重的，是选能救的';

/** 本章反复用来判读的词：正文靠它们做论证，就核它们 */
const KEY_TERMS = ['检伤分类', '复判', '红区', '对账', '教学设定'];

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 节标题：`## 一、…` */
function sections(doc) {
  return docLines(doc)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 段：非空、不以 # > | - * 起始、不以「1.」「1、」编号、且不是表格行的行 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|*\-]/.test(l) && !/^\d+[.、]/.test(l) && !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
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
      const rows = block
        .slice(1)
        .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
        .map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
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
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
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
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

/* ── 汇总 ──────────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const paras = paragraphs(doc);
  const docHanzi = hanzi(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi,
    paras: paras.length,
    avgPara: paras.length ? Math.round(docHanzi / paras.length) : 0,
    paraHanzi: paras.map(hanzi),
    sections: sections(doc),
    tables: tables(doc),
    terms: KEY_TERMS.map((t) => ({ term: t, n: count(doc, t) })),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log(`急救护理学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · ${r.paras} 段 · 平均每段 ${r.avgPara} 汉字`);
  console.log('');
  console.log(`节 ${r.sections.length} 个：${r.sections.join('｜')}`);
  console.log(`表 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => {
    console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows.length} 行`);
  });
  console.log('');
  console.log('判据词频：');
  for (const t of r.terms) console.log(`  ${t.term}：${t.n}`);
  console.log('');
  const q = r.quiz;
  console.log(`quiz ${q.total} 题（pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}）· 答案 ${q.answers.join('/')}`);
  for (const it of q.items) {
    console.log(`  ${it.n}. ${it.stage} · ${it.options} 选项 · 解释 ${it.explainHanzi} 字 · 接地 ${it.grounded} 词${it.sample.length ? `（${it.sample.join('、')}）` : ''}`);
  }
  console.log('');
  console.log(`check 题接地 ${q.checkGrounded} 道 · 答案落在 ${q.distinctAnswers} 个位置 · 最短解释 ${q.minExplain} 汉字`);
  console.log('※ 以上数字全部由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，分钟档与分级档位均为课堂演练口径，不构成诊疗或处置依据。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  paragraphs,
  tables,
  grams,
  hanzi,
  count,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  KEY_TERMS,
};
