#!/usr/bin/env node
/**
 * 中医信息学 · 第 3 章 标准化：标准是代码里的枚举与校验
 * 课程: departments/07-zhineng/17-zhongyi-xinxi-xue/chapters/03-d3/docs/zh.md
 * 数据: standards/zhongyi-xinxi-xue/units.json + chapter-map.json（用于核验正文引用的单元数量）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的每个数都从正文与单元层现算：
 *   · 正文汉字、小节数、表格行数、引号术语数
 *   · 正文自称的「24 个单元 1,390 汉字」→ 回单元层复算
 *   · 核心概念（术语统一、数据元、值域、枚举、主键、未定）在正文的出现次数
 *   · quiz 的题量、分段、选项数、解释长度、check 题接地与答案分散
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhongyi-xinxi-xue', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhongyi-xinxi-xue/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards', 'zhongyi-xinxi-xue', 'units.json');
const MAP = path.join(ROOT, 'standards', 'zhongyi-xinxi-xue', 'chapter-map.json');

const CHAPTER = 3;
const SLUG = '03-d3';
const TITLE = '标准化：标准不是一份文档，是代码里的枚举与校验';

/** 正文拿它们做论证的核心术语：代码只核「在不在、出现几次」，不替正文改词 */
const TERMS = ['术语统一', '编码统一', '接口统一', '数据元', '值域', '枚举', '主键', '未定', 'HIS', '叙构结合'];

const isHan = (ch) => /[\u3400-\u4dbf\u4e00-\u9fff]/.test(ch);
const hanzi = (s) => [...String(s || '')].filter(isHan).length;
const countTerm = (text, term) => String(text).split(term).length - 1;

/** 正文里 4 字以上的连续汉字片段：判断 quiz 正确选项是否真的落在正文里 */
function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function sectionHeadings(doc) {
  return [...String(doc).matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

function tableRows(doc) {
  const rows = String(doc).split(/\r?\n/).filter((l) => /^\|.*\|\s*$/.test(l));
  return rows.filter((l) => !/^\|[\s:|-]+\|\s*$/.test(l));
}

const quoteTerms = (doc) => [...String(doc).matchAll(/「([^」]{1,24})」/g)].map((m) => m[1]);

/** 正文自称的单元数量 */
function docClaim(doc) {
  const m = /(\d+)\s*个单元(?:共)?\s*([\d,]+)\s*汉字/.exec(String(doc));
  if (!m) throw new Error('正文里没找到单元数量的声明');
  return { units: Number(m[1]), hanzi: Number(m[2].replace(/,/g, '')) };
}

/** 从单元层复算本章规模 */
function unitFacts() {
  const all = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  const cm = JSON.parse(fs.readFileSync(MAP, 'utf8')).chapters[SLUG];
  if (!cm) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  const us = all.units.filter((u) => cm.units.includes(u.sub));
  const h = us.reduce((a, u) => a + u.hanzi, 0);
  return { units: us.length, hanzi: h, avg: Math.round((h / us.length) * 10) / 10 };
}

function quizSummary(quiz, doc) {
  const body = shingles(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const grounded = [...shingles(right)].some((g) => body.has(g));
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded,
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

function analyze() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const terms = TERMS.map((t) => ({ term: t, count: countTerm(doc, t) }));
  return {
    docHanzi: hanzi(doc),
    headings: sectionHeadings(doc),
    tableRows: tableRows(doc).length,
    quotes: quoteTerms(doc),
    claim: docClaim(doc),
    facts: unitFacts(),
    terms,
    quiz: quizSummary(quiz, doc),
    CHAPTER,
    SLUG,
    TITLE,
  };
}

function main() {
  const r = analyze();
  console.log(`中医信息学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · ${r.headings.length} 节 · 表格 ${r.tableRows} 行 · 引号术语 ${r.quotes.length} 处`);
  console.log('');
  console.log(`本章规模：正文称 ${r.claim.units} 个单元 ${r.claim.hanzi.toLocaleString('en-US')} 汉字 → 单元层复算 ${r.facts.units} 个单元 ${r.facts.hanzi.toLocaleString('en-US')} 汉字（单元均 ${r.facts.avg}）`);
  console.log('');
  console.log('核心术语在正文的出现次数：');
  for (const t of r.terms) console.log(`  ${t.count > 0 ? '✓' : '✗'} ${t.term}：${t.count}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.checkGrounded} 道 · 答案位置 ${r.quiz.answers.join('/')}`);
  console.log('※ 以上数字由正文与单元层现算，改正文后重跑即可复核。');
  console.log('※ 本章为信息标准化与数据建模的教学材料，不构成诊疗或系统选型建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  sectionHeadings,
  tableRows,
  quoteTerms,
  docClaim,
  unitFacts,
  quizSummary,
  shingles,
  hanzi,
  countTerm,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  UNITS,
  MAP,
};
