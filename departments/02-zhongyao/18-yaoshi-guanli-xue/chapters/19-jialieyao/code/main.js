#!/usr/bin/env node
/**
 * 药事管理学 · 第 19 章 假药与劣药的认定：正文与习题自检
 * 课程: departments/02-zhongyao/18-yaoshi-guanli-xue/chapters/19-jialieyao/docs/zh.md
 * 数据: standards/yaoshi-guanli/units.json（单元层原文）、standards/yaoshi-guanli/chapter-map.json（章 → 单元）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部现算：单元数、单元层汉字、引文次数来自 units.json；
 * 正文规模、二级节数、习题题量与接地数由本脚本读出 ../docs/zh.md 与 ../quiz.json。
 * 接地指 check 题的正确选项里至少有一段 6 个汉字的连续片段逐字出现在正文里 —— 习题必须与正文同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'yaoshi-guanli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/yaoshi-guanli/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'yaoshi-guanli', 'units.json');
const MAP = path.join(ROOT, 'standards', 'yaoshi-guanli', 'chapter-map.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '19';
const SLUG = '19-jialieyao';
const TITLE = '假药与劣药的认定';

const loadAll = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const loadMap = () => JSON.parse(fs.readFileSync(MAP, 'utf8'));

/** 本章在章映射里对应的单元号 */
function chapterKeys() {
  const cm = loadMap().chapters;
  if (!cm[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  return cm[SLUG].units.slice();
}

/** 单元层里本章的单元（按单元号自然序） */
function chapterUnits() {
  const keys = chapterKeys();
  return loadAll().units
    .filter((u) => keys.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

/** 本章在单元层上的统计：汉字、引文、数值命中、三组词群的频次 */
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

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 正文里 n 字连续汉字片段集合 */
function grams(text, n = 6) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 选项里是否有 n 字连续片段逐字出现在正文里 */
function grounded(option, body, n = 6) {
  const clean = String(option || '').replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i + n <= clean.length; i += 1) if (body.has(clean.slice(i, i + n))) return true;
  return false;
}

/** 正文与习题的自检读数 */
function inspect(doc, quiz) {
  const body = grams(doc, 6);
  const questions = Array.isArray(quiz) ? quiz : (quiz.questions || []);
  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of questions) stages[q.stage] = (stages[q.stage] || 0) + 1;
  const checks = questions.filter((q) => q.stage === 'check');
  const hit = checks.filter((q) => grounded((q.options || [])[q.correct], body)).length;
  const minExplain = questions.length ? Math.min(...questions.map((q) => hz(q.explain || q.explanation))) : 0;
  return { hanzi: hz(doc), secs: (doc.match(/^## /gm) || []).length, questions, stages, checks, hit, minExplain };
}

function main() {
  const units = chapterUnits();
  const s = summarize(units);
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const m = loadMap().chapters[SLUG];
  const q = inspect(doc, quiz);

  console.log(`药事管理学 · 第 ${CHAPTER} 章 ${m.title}`);
  console.log('');
  console.log(`单元 ${units.map((u) => u.sub).join('、')} · 单元层 ${s.hanzi.toLocaleString('en-US')} 汉字 · 引文 ${s.cites} 次（${s.books} 部文件）`);
  console.log(`正文 ${q.hanzi.toLocaleString('en-US')} 汉字 · 二级节 ${q.secs} 个`);
  console.log('');
  console.log('词群频次（单元层 measure 求和，只作定位参考）：');
  for (const [k, v] of Object.entries(s.views).sort((a, b) => b[1] - a[1])) console.log(`  ${k}：${v}`);
  console.log(`  → 最密一组：${s.viewTop[0]}（${s.viewTop[1]}）`);
  console.log('');
  console.log(`习题 ${q.questions.length} 题：pre ${q.stages.pre} / check ${q.stages.check} / post ${q.stages.post} · 最短解释 ${q.minExplain} 汉字`);
  console.log(`接地 check 题 ${q.hit}/${q.checks.length}（正确选项的 6 字片段能在正文找到）`);
  console.log('');

  const ok = q.hanzi >= 2500 && q.secs >= 4
    && q.questions.length === 6 && q.stages.pre === 1 && q.stages.check === 3 && q.stages.post === 2
    && q.hit === q.checks.length && q.minExplain >= 40;
  if (!ok) {
    console.error('自检未通过：正文规模、题量分布或接地数不达标');
    process.exit(1);
  }
  console.log('※ 教学样例：数字由 standards/yaoshi-guanli/units.json 与当章正文现算，不手打。');
  console.log('※ 本章为教学材料，不构成法规解读与合规结论。');
}

if (require.main === module) main();

module.exports = { chapterKeys, chapterUnits, summarize, inspect, grounded, CHAPTER, SLUG, TITLE };
