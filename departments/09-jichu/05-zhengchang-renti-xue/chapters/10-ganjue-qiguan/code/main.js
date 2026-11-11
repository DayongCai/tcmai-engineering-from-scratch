#!/usr/bin/env node
/**
 * 正常人体学 · 第 10 章 感觉器官：本章统计口径
 * 课程: departments/09-jichu/05-zhengchang-renti-xue/chapters/10-ganjue-qiguan/docs/zh.md
 * 数据: standards/zhengchang-renti-xue/units.json（216 单元层，每单元带三辨与四位面词频）
 * 取数: standards/zhengchang-renti-xue/chapter-map.json（课程章 → 教材单元号）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：本章规模、三辨分布、四位面分布、引书数与数值命中，都由本脚本从单元层读出。
 * 手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
const CHAPTER = '10';
const SLUG = '10-ganjue-qiguan';

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

  console.log(`正常人体学 · 第 ${CHAPTER} 章 ${cm.title}`);
  console.log('');
  console.log(`本章 ${units.length} 单元 · ${s.hanzi.toLocaleString('en-US')} 汉字 · 教材章 ${cm.srcChapters.join('、')}`);
  console.log('');
  console.log('三辨分布（单元层 measure.views 求和）：');
  for (const [k, v] of Object.entries(s.views).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}`);
  }
  console.log(`  → 主导一辨：${s.viewTop[0]}（${s.viewTop[1]}）`);
  console.log('');
  console.log(`四位面（${Object.keys(all.levels).join('／')}）分布：`);
  const ltot = Object.values(s.levels).reduce((a, b) => a + b, 0) || 1;
  for (const [k, v] of Object.entries(s.levels).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}（${((v / ltot) * 100).toFixed(1)}%）`);
  }
  console.log(`  → 主导位面：${s.levelTop[0]}（${s.levelTop[1]}）`);
  console.log('');
  console.log(`引书 ${s.books} 部 / ${s.cites} 次；数值类命中 ${s.values} 处。`);
  console.log('');
  console.log('※ 教学样例：数字由 standards/zhengchang-renti-xue/units.json 现算，不手打；改教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { chapterKeys, chapterUnits, summarize, CHAPTER, SLUG };
