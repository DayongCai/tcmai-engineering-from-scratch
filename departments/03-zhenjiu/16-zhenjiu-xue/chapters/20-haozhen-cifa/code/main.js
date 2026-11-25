#!/usr/bin/env node
/**
 * 针灸学 · 第 20 章 毫针刺法：本章统计口径
 * 课程: departments/03-zhenjiu/16-zhenjiu-xue/chapters/20-haozhen-cifa/docs/zh.md
 * 数据: standards/zhenjiu-xue/units.json（250 单元层，含 views／levels 词频）
 * 习题: 只读 ../docs/zh.md 与 ../quiz.json —— 6 题、4 选项、解释 40–80 汉字、check 题引正文原句，不达标 exit 1
 * 取数: standards/zhenjiu-xue/chapter-map.json（课程章 → 教材单元号）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本章规模、views／levels 分布、引书数与数值命中，都由本脚本从单元层读出。
 * 手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenjiu-xue', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenjiu-xue/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'zhenjiu-xue', 'units.json');
const MAP = path.join(ROOT, 'standards', 'zhenjiu-xue', 'chapter-map.json');
const CHAPTER = '20';
const SLUG = '20-haozhen-cifa';

const loadAll = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const loadMap = () => JSON.parse(fs.readFileSync(MAP, 'utf8'));

function chapterKeys() {
  const cm = loadMap().chapters;
  if (!cm[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  return cm[SLUG].units.slice();
}

function chapterUnits() {
  const keys = chapterKeys();
  const all = loadAll();
  return all.units
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
  const units = chapterUnits();
  const s = summarize(units);
  const cm = loadMap().chapters[SLUG];
  const all = loadAll();

  console.log(`针灸学 · 第 ${CHAPTER} 章 ${cm.title}`);
  console.log('');
  console.log(`本章 ${units.length} 单元 · ${s.hanzi.toLocaleString('en-US')} 汉字 · 教材章 ${cm.srcChapters.join('、')}`);
  console.log('');
  console.log('measure.views 分布（单元层求和）：');
  for (const [k, v] of Object.entries(s.views).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}`);
  }
  console.log(`  → 主导视角：${s.viewTop[0]}（${s.viewTop[1]}）`);
  console.log('');
  console.log(`measure.levels 分布（${Object.keys(all.levels).join('／')}）：`);
  const ltot = Object.values(s.levels).reduce((a, b) => a + b, 0) || 1;
  for (const [k, v] of Object.entries(s.levels).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}（${((v / ltot) * 100).toFixed(1)}%）`);
  }
  console.log(`  → 主导层级：${s.levelTop[0]}（${s.levelTop[1]}）`);
  console.log('');
  console.log(`引书 ${s.books} 部 / ${s.cites} 次；数值类命中 ${s.values} 处。`);
  console.log('');
  console.log('※ 教学样例：数字由 standards/zhenjiu-xue/units.json 现算，不手打；改教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

/* ── 习题层自检：只读 ../docs/zh.md 与 ../quiz.json ───────────────────────── */

const DOC_ZH = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ_JSON = path.join(__dirname, '..', 'quiz.json');
const hzN = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 把文本切成 n 字连续汉字片段（与习题门的判据同一算法） */
function grams(text, n) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/**
 * 习题自检：6 题（pre 1 / check 3 / post 2）· 每题 4 选项 · 解释 40–80 汉字 ·
 * 每道 check 的正确选项里必须有一句 ≥6 汉字的当章正文原话。
 * 任何一条不成立即返回 false，调用方 exit 1 —— 习题不许脱离正文自说自话。
 */
function checkExercises() {
  const doc = fs.readFileSync(DOC_ZH, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ_JSON, 'utf8'));
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const body = grams(doc, 6);
  const stage = { pre: 0, check: 0, post: 0 };
  const bad = [];
  const lens = [];
  let hit = 0;

  for (const q of qs) stage[q.stage] = (stage[q.stage] || 0) + 1;
  if (qs.length !== 6) bad.push(`题数 ${qs.length}（需 6）`);
  if (stage.pre !== 1 || stage.check !== 3 || stage.post !== 2) {
    bad.push(`分段 pre${stage.pre}/check${stage.check}/post${stage.post}（需 1/3/2）`);
  }

  for (const q of qs) {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4) bad.push('有题不是 4 选项');
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      bad.push('correct 下标非法');
    }
    const n = hzN(q.explain || q.explanation);
    lens.push(n);
    if (n < 40 || n > 80) bad.push(`解释 ${n} 汉字（需 40–80）`);
    if (q.stage === 'check') {
      const right = String(opts[q.correct] || '');
      if ([...grams(right, 6)].some((g) => body.has(g))) hit += 1;
      else bad.push('check 题的正确选项引不到 ≥6 汉字正文原句');
    }
  }
  if (hit < 3) bad.push(`接地 check ${hit}/3`);

  console.log('');
  console.log(`习题 ${qs.length} 题 (pre ${stage.pre}/check ${stage.check}/post ${stage.post}) · 解释 ${Math.min(...lens)}–${Math.max(...lens)} 汉字 · 接地 check ${hit}/${stage.check}`);
  console.log('※ 接地：check 题的正确选项里必须有一句 ≥6 汉字的正文原话 —— 习题与 ../docs/zh.md 同源。');

  for (const b of bad) console.error('  ✗ ' + b);
  return bad.length === 0;
}

function run() {
  main();
  if (!checkExercises()) {
    console.error('习题自检未通过');
    process.exit(1);
  }
}

if (require.main === module) run();

module.exports = { chapterKeys, chapterUnits, summarize, checkExercises, CHAPTER, SLUG };
