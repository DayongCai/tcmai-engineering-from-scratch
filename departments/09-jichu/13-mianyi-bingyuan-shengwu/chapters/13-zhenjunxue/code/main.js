#!/usr/bin/env node
/**
 * 免疫学基础与病原生物学 · 第 13 章 真菌致病多不靠毒素，而靠机会与慢性迁延：结构与主题词复算
 * 课程: departments/09-jichu/13-mianyi-bingyuan-shengwu/chapters/13-zhenjunxue/docs/zh.md
 * 数据: standards/mianyi-bingyuan-shengwu/units.json（单元层：每单元带主题词频与篇层归属）
 * 取数: standards/mianyi-bingyuan-shengwu/chapter-map.json（课程章 → 教材单元号）
 * 依赖: 仅 Node.js 标准库
 *
 * 所有数字现算：单元数、汉字量、主题簇分布、篇层归属、正文小节数与引书次数，
 * 一律从底本读出，不手打 —— 底本改版后重跑即可复现。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STD = 'mianyi-bingyuan-shengwu';

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', STD, 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/' + STD + '/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', STD, 'units.json');
const MAP = path.join(ROOT, 'standards', STD, 'chapter-map.json');
const DOC = path.join(ROOT, 'departments', '09-jichu', '13-mianyi-bingyuan-shengwu', 'chapters', '13-zhenjunxue', 'docs', 'zh.md');
const CHAPTER = '13';
const SLUG = '13-zhenjunxue';

const loadAll = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const loadMap = () => JSON.parse(fs.readFileSync(MAP, 'utf8'));

/** 本章在 chapter-map 里登记的单元号（按原样返回） */
function chapterKeys() {
  const cm = loadMap().chapters;
  if (!cm[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  return cm[SLUG].units.slice();
}

/** 本章单元记录（按单元号自然序） */
function chapterUnits() {
  const keys = chapterKeys();
  const all = loadAll();
  return all.units
    .filter((u) => keys.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

/** 本章规模与两类分布：全部从单元层的 measure 求和，不写死 */
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

/** 术语命中：把底本的主题簇关键词逐个回数到本章单元正文，返回降序表 */
function topicTerms(units) {
  const clusters = loadAll().views || {};
  const out = [];
  for (const [cluster, terms] of Object.entries(clusters)) {
    for (const term of terms) {
      let n = 0;
      for (const u of units) n += String(u.prose || '').split(term).length - 1;
      if (n > 0) out.push({ cluster, term, n });
    }
  }
  return out.sort((a, b) => b.n - a.n || a.term.localeCompare(b.term, 'zh'));
}

/** 正文侧统计：小节数、正文段数、正文汉字数、边界条目数（从本章 docs/zh.md 直读） */
function docStats() {
  const raw = fs.readFileSync(DOC, 'utf8');
  let sections = 0;
  let paras = 0;
  let hanzi = 0;
  let boundary = 0;
  let inBoundary = false;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('## ')) {
      sections += 1;
      inBoundary = t.includes('代价与边界');
      continue;
    }
    if (t.startsWith('#')) continue;
    if (t.startsWith('```') || t.startsWith('**') || t.startsWith('>')) continue;
    if (inBoundary && /^(\d+\.|-)\s/.test(t)) { boundary += 1; continue; }
    paras += 1;
    hanzi += (t.match(/[\u4e00-\u9fff]/g) || []).length;
  }
  return { sections, paras, hanzi, boundary };
}

function main() {
  const units = chapterUnits();
  const s = summarize(units);
  const d = docStats();
  const cm = loadMap().chapters[SLUG];
  const terms = topicTerms(units).slice(0, 5);

  console.log(`免疫学基础与病原生物学 · 第 ${CHAPTER} 章 真菌致病多不靠毒素，而靠机会与慢性迁延`);
  console.log('');
  console.log(`本章 ${units.length} 单元 · ${s.hanzi.toLocaleString('en-US')} 汉字 · 教材章 ${cm.srcChapters.join('、')}`);
  console.log(`正文 ${d.sections} 小节 · ${d.paras} 段 · ${d.hanzi.toLocaleString('en-US')} 汉字 · 边界条目 ${d.boundary} 条`);
  console.log('');
  console.log('主题簇分布（单元层 measure.views 求和）：');
  for (const [k, v] of Object.entries(s.views).sort((a, b) => b[1] - a[1])) console.log(`  ${k}：${v}`);
  console.log(`  → 主导主题簇：${s.viewTop[0]}（${s.viewTop[1]}）`);
  console.log('');
  console.log('篇层归属（单元层 measure.levels 求和）：');
  const ltot = Object.values(s.levels).reduce((a, b) => a + b, 0) || 1;
  for (const [k, v] of Object.entries(s.levels).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}：${v}（${((v / ltot) * 100).toFixed(1)}%）`);
  }
  console.log(`  → 主导篇层：${s.levelTop[0]}（${s.levelTop[1]}）`);
  console.log('');
  console.log('术语命中（主题簇关键词回数本章单元正文，前 5）：');
  for (const t of terms) console.log(`  ${t.term}：${t.n}（${t.cluster}）`);
  console.log('');
  console.log(`引书 ${s.books} 部 / ${s.cites} 次；数值类命中 ${s.values} 处。`);
  console.log('');
  console.log(`※ 教学样例：数字由 standards/${STD}/units.json 与本章 docs/zh.md 现算，不手打；改底本后重跑即可复现。`);
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { chapterKeys, chapterUnits, summarize, topicTerms, docStats, CHAPTER, SLUG };
