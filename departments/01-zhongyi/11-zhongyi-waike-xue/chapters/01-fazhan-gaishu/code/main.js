#!/usr/bin/env node
/**
 * 中医外科学 · 第 1 章 发展概要：定义、范围、源流与学习方法
 * 课程: departments/01-zhongyi/11-zhongyi-waike-xue/chapters/01-fazhan-gaishu/docs/zh.md
 * 出处: 教材·第1章（1.1–1.4，8 个知识单元）
 * 数据: standards/waike/units.json（325 单元层，每单元带三辨 / 四位面词频与数值计数）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「边界是比较出来的」。
 * 比较的凭据——三辨重心在哪一轴、四位面覆盖到哪一层、引了几部书——
 * 都能在单元层数出来。手打的数字会在教材改版后静默过期；现算的数字一旦对不上，
 * 本章的测试会先响。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/01-zhongyi/11-zhongyi-waike-xue/chapters/01-fazhan-gaishu/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/waike 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'waike', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/waike/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'waike', 'units.json');
const CHAPTER = '1';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

/** 本章的 8 个知识单元，按 sub 号排 */
function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

function sum(dict) {
  return Object.values(dict).reduce((a, b) => a + b, 0);
}

/** 把若干单元的词频合并成一张总表（三辨或四位面） */
function merge(list, field) {
  const out = {};
  for (const u of list) {
    for (const [k, v] of Object.entries(u.measure[field])) out[k] = (out[k] || 0) + v;
  }
  return out;
}

/** 排序后的 [{key, count, share}]，用于「重心在哪一轴」 */
function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** 按节聚合：每节几个单元、多少字（教材四节各 2 单元，是本章的结构特征） */
function bySection(list) {
  const out = new Map();
  for (const u of list) {
    const key = u.sec || '（未标节）';
    const it = out.get(key) || { sec: key, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

/** 引书计数：正文里出现多少部书（《…》），以及被引最多的三部 */
function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) {
      const name = m[1];
      counter.set(name, (counter.get(name) || 0) + 1);
    }
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 3) };
}

/** 规模：单元数、字数、均值 */
function shape(list) {
  const hanzi = list.reduce((a, u) => a + u.hanzi, 0);
  return {
    units: list.length,
    hanzi,
    mean: list.length ? Math.round(hanzi / list.length) : 0,
    valueLike: list.reduce((a, u) => a + u.measure.valueLike, 0),
    digits: list.reduce((a, u) => a + u.measure.digits, 0),
  };
}

module.exports = { CHAPTER, load, chapterUnits, merge, rank, bySection, citations, shape, sum };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  const views = rank(merge(list, 'views'));
  const levels = rank(merge(list, 'levels'));
  const books = citations(list);

  console.log('═══ 中医外科学 · 第 1 章 发展概要 ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike}（总论不写剂量，命中多为年份与卷数）· 数字字符 ${s.digits}`);
  console.log('\n按节（教材四节各 2 单元）：');
  for (const sec of bySection(list)) {
    console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  }
  console.log('\n三辨重心：');
  for (const v of views) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n四位面覆盖：');
  for (const v of levels) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log(`\n引书 ${books.books} 部 · 引用 ${books.total} 次 · 前三：${books.top.map(([n, c]) => `${n}(${c})`).join('、')}`);
  console.log('\n单元清单：');
  for (const u of list) {
    console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字\t${u.tri.view.primary || '—'}/${u.tri.level.primary || '—'}`);
  }
}

// 教学样例声明：契约要求每章输出含临床边界声明（tests/test_chapter_code.js）
if (require.main === module) {
  console.log('※ 教学样例：数字由 standards/waike/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
