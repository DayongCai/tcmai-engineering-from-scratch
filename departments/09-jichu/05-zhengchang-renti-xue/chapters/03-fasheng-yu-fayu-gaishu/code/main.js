#!/usr/bin/env node
/**
 * 正常人体学 · 第 3 章 人体发生与发育概述
 *
 *   node code/main.js
 *
 * 正文：chapters/03-fasheng-yu-fayu-gaishu/docs/zh.md
 * 习题：chapters/03-fasheng-yu-fayu-gaishu/quiz.json
 * 教材单元：standards/zhengchang-renti-xue/units.json（章映射 standards/zhengchang-renti-xue/chapter-map.json）
 * 依赖：仅 Node.js 标准库
 *
 * 数字全部现算：教材单元数与汉字数读单元层，正文规模、节、表、引书与数值命中
 * 读本章正文，习题结构与接地情况读本章习题。手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 3;
const SLUG = '03-fasheng-yu-fayu-gaishu';
const TITLE = '人体发生与发育概述';

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhengchang-renti-xue', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhengchang-renti-xue/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'zhengchang-renti-xue', 'units.json');
const MAP = path.join(ROOT, 'standards', 'zhengchang-renti-xue', 'chapter-map.json');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/* ── 教材单元：章节 → 单元号 ─────────────────────────────────── */

const loadMap = () => JSON.parse(fs.readFileSync(MAP, 'utf8'));

function chapterKeys() {
  const cm = loadMap().chapters;
  if (!cm[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  return cm[SLUG].units.slice();
}

function chapterUnits() {
  const keys = chapterKeys();
  const all = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  return all.units
    .filter((u) => keys.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

function summarize(units) {
  let count = 0;
  let hanziTotal = 0;
  let values = 0;
  let cites = 0;
  const bookSet = new Set();
  for (const u of units) {
    count += 1;
    hanziTotal += u.hanzi || 0;
    values += (u.measure && u.measure.valueLike) || 0;
    for (const m of String(u.prose || '').matchAll(/《([^》]+)》/g)) {
      bookSet.add(m[1]);
      cites += 1;
    }
  }
  return { count, hanzi: hanziTotal, values, books: bookSet.size, cites };
}

/* ── 正文：节、段、表、引书、数值 ───────────────────────────── */

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const docLines = (doc) => String(doc).replace(/\r\n/g, '\n').split('\n');

function sections(doc) {
  return docLines(doc)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

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
      out.push({
        header: cells(block[0]),
        rows: block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells),
      });
    } else {
      i += 1;
    }
  }
  return out;
}

function books(doc) {
  const set = new Set();
  for (const m of String(doc).matchAll(/《([^》]+)》/g)) set.add(m[1]);
  return [...set];
}

// 长单位在前，避免「周岁」被「周」先吃掉；只统计带单位的数值读数
const VALUE_RE = /(\d+(?:\.\d+)?)\s*(?:mmHg|μm|µm|mm|cm|mL|分钟|小时|个月|周岁|秒|天|周|次|对|条|颗|层|处)/g;

function readings(doc) {
  return String(doc).match(VALUE_RE) || [];
}

/* ── 习题体检 ───────────────────────────────────────────────── */

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function longestHit(option, doc) {
  const clean = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
  const o = clean(option);
  const d = clean(doc);
  for (let n = o.length; n >= 1; n -= 1) {
    for (let i = 0; i + n <= o.length; i += 1) {
      if (d.includes(o.slice(i, i + n))) return n;
    }
  }
  return 0;
}

function quizCheck(quiz, doc) {
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const issues = [];
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = longestHit(right, doc);
    const why = q.explain || q.explanation || '';
    if (opts.length !== 4) issues.push('第 ' + (i + 1) + ' 题选项 ' + opts.length + ' 个');
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) issues.push('第 ' + (i + 1) + ' 题 correct 越界');
    if (hanzi(why) < 30) issues.push('第 ' + (i + 1) + ' 题解释 ' + hanzi(why) + ' 汉字，少于 30');
    if (q.stage === 'check' && hit < 6) issues.push('第 ' + (i + 1) + ' 题接地仅 ' + hit + ' 汉字');
    return { n: i + 1, stage: q.stage, options: opts.length, correct: q.correct, explainHanzi: hanzi(why), hit };
  });
  if (items.length < 6) issues.push('题量 ' + items.length + ' 少于 6');
  for (const s of ['pre', 'check', 'post']) if (!stage[s]) issues.push('缺 ' + s + ' 段');
  const grounded = items.filter((x) => x.stage === 'check' && x.hit >= 6).length;
  if (grounded < 2) issues.push('check 题接地 ' + grounded + ' 道，少于 2');
  return {
    total: items.length,
    stage,
    items,
    grounded,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    maxExplain: items.length ? Math.max(...items.map((x) => x.explainHanzi)) : 0,
    issues,
  };
}

/* ── 汇总 ──────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const ts = tables(doc);
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, rows: t.rows.length })),
    books: books(doc),
    readings: readings(doc),
    quiz: quizCheck(quiz, doc),
  };
}

function main() {
  const units = chapterUnits();
  const s = summarize(units);
  const r = analyze();
  const q = r.quiz;

  console.log('正常人体学 · 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('');
  console.log('教材单元 ' + s.count + ' 个 · ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · 引书 ' + s.books + ' 部');
  console.log(
    '正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' +
      r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张 · 数值读数 ' + r.readings.length + ' 处'
  );
  console.log('');
  console.log('节：');
  for (const sec of r.sections) console.log('  ' + sec);
  console.log('');
  console.log('正文引书（' + r.books.length + ' 部）：' + (r.books.length ? r.books.join('、') : '（无）'));
  console.log('');
  console.log(
    '习题 ' + q.total + ' 题（pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post +
      '）· check 题接地 ' + q.grounded + ' 道 · 解释 ' + q.minExplain + '—' + q.maxExplain + ' 汉字'
  );
  for (const it of q.items) {
    console.log(
      '  ' + String(it.n).padStart(2, '0') + ' ' + String(it.stage).padEnd(5) +
        ' 选项 ' + it.options + ' · 解释 ' + it.explainHanzi + ' 汉字 · 接地 ' + it.hit
    );
  }
  console.log(q.issues.length ? '  → 体检不合格：' + q.issues.join('；') : '  → 体检全部合格');
  console.log('');
  console.log('※ 以上数字由本章正文、习题与教材单元层现算，改稿后重跑即可复核。');
  console.log('※ 本章为正常人体学教学材料，只描述结构与功能的类别与关系，不构成医学意见、诊断或治疗建议。');
  if (q.issues.length) process.exitCode = 2;
}

if (require.main === module) main();

module.exports = {
  chapterKeys,
  chapterUnits,
  summarize,
  analyze,
  sections,
  paragraphs,
  tables,
  books,
  readings,
  grams,
  longestHit,
  quizCheck,
  hanzi,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  UNITS,
  MAP,
};
