#!/usr/bin/env node
/**
 * 骨伤临床轮转 · 第 5 章 创伤轮转：第一课是分工，不是技术
 * 课程: departments/04-gushang/16-gushang-linchuang-lunzhuan/chapters/05-jizhen-chuangshang/docs/zh.md
 * 数据: standards/gushang-lunzhuan/units.json + chapter-map.json（核验正文自称的单元数量与字数）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的每个数都从正文现算：
 *   · 正文汉字、小节数、表格行数、引号术语数
 *   · 正文自称的「3 个单元、22,486 汉字」→ 回单元层复算
 *   · 判据词（分工、绿色通道、止血带、未遂、休克）在正文的出现次数
 *   · quiz 的题量、分段、四选项、解释长度、check 题接地与答案分散
 * 正文或 quiz 一改，重跑就能看出是哪一行对不上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'gushang-lunzhuan', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/gushang-lunzhuan/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards', 'gushang-lunzhuan', 'units.json');
const MAP = path.join(ROOT, 'standards', 'gushang-lunzhuan', 'chapter-map.json');

const CHAPTER = 5;
const SLUG = '05-jizhen-chuangshang';
/** chapter-map.json 的键不带章号前缀 */
const MAP_KEY = 'jizhen-chuangshang';
const TITLE = '创伤轮转：第一课是分工，不是技术';

/** 本章用来立判断的判据词：代码只核「在不在、出现几次」，不替正文改词 */
const TERMS = ['分工', '站位', '绿色通道', '止血带', '未遂', '复盘', '休克', '气道'];

/** 正文小节标题里必须出现的判据主题 */
const REQUIRED_HEADINGS = ['接人', 'ABCDE', '四项现场技术', '绿色通道', '出科验收'];

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

/** 正文自称的单元数量与字数：「3 个单元，却压着 22,486 汉字」 */
function docClaim(doc) {
  const m = /(\d+)\s*个单元[^0-9]{0,10}?([\d,]+)\s*汉字/.exec(String(doc));
  if (!m) throw new Error('正文里没找到单元数量的声明');
  return { units: Number(m[1]), hanzi: Number(m[2].replace(/,/g, '')) };
}

/** 从单元层复算本章规模 */
function unitFacts() {
  const all = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  const cm = JSON.parse(fs.readFileSync(MAP, 'utf8')).chapters[MAP_KEY];
  if (!cm) throw new Error('chapter-map.json 里没有这一章: ' + MAP_KEY);
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
  return {
    docHanzi: hanzi(doc),
    headings: sectionHeadings(doc),
    tableRows: tableRows(doc).length,
    quotes: quoteTerms(doc),
    claim: docClaim(doc),
    facts: unitFacts(),
    terms: TERMS.map((t) => ({ term: t, count: countTerm(doc, t) })),
    quiz: quizSummary(quiz, doc),
    CHAPTER,
    SLUG,
    TITLE,
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤临床轮转 · 第 ${r.CHAPTER} 章 ${r.TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · ${r.headings.length} 节 · 表格 ${r.tableRows} 行 · 引号术语 ${r.quotes.length} 处`);
  console.log('');
  console.log(`本章规模：正文称 ${r.claim.units} 个单元共 ${r.claim.hanzi.toLocaleString('en-US')} 汉字 → 单元层复算 ${r.facts.units} 个单元 ${r.facts.hanzi.toLocaleString('en-US')} 汉字（单元均 ${r.facts.avg}）`);
  console.log('');
  console.log('判据词在正文的出现次数：');
  for (const t of r.terms) console.log(`  ${t.count > 0 ? '✓' : '✗'} ${t.term}：${t.count}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.checkGrounded} 道 · 答案位置 ${r.quiz.answers.join('/')}`);
  console.log('※ 以上数字由正文与单元层现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成急救指令或处置指导。');
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
  MAP_KEY,
  TITLE,
  TERMS,
  REQUIRED_HEADINGS,
  DOC,
  QUIZ,
  UNITS,
  MAP,
};
