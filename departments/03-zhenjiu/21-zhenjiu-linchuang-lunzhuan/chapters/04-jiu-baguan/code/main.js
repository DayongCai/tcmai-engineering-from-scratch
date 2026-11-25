#!/usr/bin/env node
/**
 * 针灸临床轮转 · 第 4 章 灸法与拔罐的适应证与意外处置：正文与习题自检
 * 课程: departments/03-zhenjiu/21-zhenjiu-linchuang-lunzhuan/chapters/04-jiu-baguan
 * 统计: 前三行的单元数、汉字数与教材章取自 standards/zhenjiu-lunzhuan2（与正文「运行与验证」节录一致）
 * 自检: 只读 ../docs/zh.md 与 ../quiz.json —— 正文字数、二级节数、题量、解释长度与接地数全由这两个文件现算
 * 依赖: 仅 Node.js 标准库
 *
 * 接地数指 check 题的正确选项里，至少有一个 ≥6 字的连续词组真的出现在当章正文里 —— 习题必须与正文同源。
 * chapterKeys / chapterUnits / summarize 保留为兼容导出，调用时才读 standards/，运行路径不依赖它们。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-jiu-baguan';
const TITLE = '灸法与拔罐的适应证与意外处置';

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** n 字连续汉字片段集合（默认 4 字，与官方习题门同口径） */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 选项与正文同源判定：默认 6 字连续重合，比官方门的 4 字更严 */
function grounded(option, body, n = 6) {
  const clean = String(option || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + n <= clean.length; i += 1) {
    if (body.has(clean.slice(i, i + n))) return clean.slice(i, i + n);
  }
  return '';
}

const loadDoc = () => fs.readFileSync(DOC, 'utf8');
const loadQuiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

/** 正文与习题的自检口径：只吃 docs + quiz */
function selfCheck(doc, quiz) {
  const why = (q) => q.explain || q.explanation || '';
  const qs = (quiz && Array.isArray(quiz.questions)) ? quiz.questions : [];
  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of qs) stages[q.stage] = (stages[q.stage] || 0) + 1;
  const body6 = shingles(doc, 6);
  const checks = qs.filter((q) => q.stage === 'check');
  const hits = checks.map((q) => grounded((q.options || [])[q.correct], body6, 6)).filter(Boolean);
  const lens = qs.map((q) => hz(why(q)));
  const four = qs.every((q) => Array.isArray(q.options) && q.options.length === 4);
  const idx = qs.every((q) => Number.isInteger(q.correct) && q.correct >= 0 && q.correct < (q.options || []).length);
  const secs = (doc.match(/^## /gm) || []).length;
  const minExplain = lens.length ? Math.min(...lens) : 0;
  const maxExplain = lens.length ? Math.max(...lens) : 0;
  return {
    hanzi: hz(doc),
    secs,
    total: qs.length,
    stages,
    checks: checks.length,
    hit: hits.length,
    minExplain,
    maxExplain,
    four,
    idx,
    ok: hz(doc) >= 2500 && secs >= 4
      && qs.length === 6 && stages.pre === 1 && stages.check === 3 && stages.post === 2
      && four && idx && hits.length === checks.length
      && lens.length > 0 && minExplain >= 40 && maxExplain <= 80,
  };
}

/* ── 兼容旧导出的统计层 ── */

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenjiu-lunzhuan2', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenjiu-lunzhuan2/units.json —— 章节目录是否已脱离仓库？');
}

const loadAll = () => JSON.parse(fs.readFileSync(path.join(findRoot(DIR), 'standards', 'zhenjiu-lunzhuan2', 'units.json'), 'utf8'));
const loadMap = () => JSON.parse(fs.readFileSync(path.join(findRoot(DIR), 'standards', 'zhenjiu-lunzhuan2', 'chapter-map.json'), 'utf8'));

function chapterKeys() {
  const cm = loadMap().chapters;
  if (!cm[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  return cm[SLUG].units.slice();
}

function chapterUnits() {
  const keys = chapterKeys();
  return loadAll().units
    .filter((u) => keys.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

function summarize(units) {
  const views = {};
  const levels = {};
  let hanzi = 0;
  let values = 0;
  let cites = 0;
  const books = new Set();
  for (const u of units) {
    hanzi += u.hanzi;
    values += (u.measure && u.measure.valueLike) || 0;
    for (const [k, v] of Object.entries((u.measure && u.measure.views) || {})) views[k] = (views[k] || 0) + v;
    for (const [k, v] of Object.entries((u.measure && u.measure.levels) || {})) levels[k] = (levels[k] || 0) + v;
    for (const m of (u.prose || '').matchAll(/《([^》]+)》/g)) { books.add(m[1]); cites += 1; }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
  return { views, levels, hanzi, values, cites, books: books.size, viewTop: top(views), levelTop: top(levels) };
}

function main() {
  const doc = loadDoc();
  const s = selfCheck(doc, loadQuiz());
  const cm = loadMap().chapters[SLUG];
  const units = chapterUnits();

  console.log(`针灸临床轮转 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`本章 ${units.length} 单元 · ${summarize(units).hanzi.toLocaleString('en-US')} 汉字 · 教材章 ${cm.srcChapters.join('、')}`);
  console.log('');
  console.log(`正文 ${s.hanzi.toLocaleString('en-US')} 汉字 · 二级节 ${s.secs}`);
  console.log(`习题 ${s.total} 题 (pre ${s.stages.pre}/check ${s.stages.check}/post ${s.stages.post}) · 解释 ${s.minExplain}–${s.maxExplain} 汉字`);
  console.log(`接地 check 题 ${s.hit}/${s.checks}（正确选项与正文连续重合 6 字以上）`);
  console.log('');
  console.log('※ 教学样例：统计行由 standards/zhenjiu-lunzhuan2/units.json 现算；自检只读 docs/zh.md 与 quiz.json。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');

  if (!s.ok) {
    console.error('自检未通过');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { chapterKeys, chapterUnits, summarize, selfCheck, grounded, shingles, CHAPTER, SLUG, TITLE };
