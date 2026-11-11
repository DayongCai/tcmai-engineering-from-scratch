#!/usr/bin/env node
/**
 * 中药化学 · 第 3 章 中药的炮制与制剂：本章统计口径
 * 课程: departments/02-zhongyao/16-linchuang-zhongyaoxue/chapters/03-paozhi-zhiji/docs/zh.md
 * 数据: standards/linchuang-zhongyao/units.json（55 单元层，每单元带三辨=结构特征/理化性质/提分与检识 与 四位面=生源途径 词频）
 * 取数: standards/linchuang-zhongyao/chapter-map.json（课程章 → 教材单元号）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：正文引用的每个规模、重心、引书数，都由本脚本从单元层读出。
 * 手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'linchuang-zhongyao', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/linchuang-zhongyao/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'linchuang-zhongyao', 'units.json');
const CHAPTER = '3';
const KEYS = ['3.1.1', '3.1.2', '3.1.3', '3.2.1', '3.2.2'];

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units) {
  return units.units
    .filter((u) => KEYS.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);

function merge(list, field) {
  const out = {};
  for (const u of list) {
    const src = (u.measure && u.measure[field]) || {};
    for (const [k, v] of Object.entries(src)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

function byBookSection(list) {
  const out = new Map();
  for (const u of list) {
    const key = `教材第${u.chapter}章`;
    const it = out.get(key) || { sec: key, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 3) };
}

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

/** 取穴与刺灸的操作词：本章正文里出现多少处「定位／分寸／直刺／灸」类的可执行指令 */
function hands(list) {
  const WORDS = ['定位', '骨度', '分寸', '同身寸', '直刺', '斜刺', '平刺', '艾灸', '温针灸', '留针', '禁针', '禁灸'];
  const pairs = WORDS.map((w) => [w, list.reduce((a, u) => a + u.prose.split(w).length - 1, 0)]);
  return Object.fromEntries(pairs).constructor === Object
    ? pairs.filter(([, c]) => c).sort((a, b) => b[1] - a[1])
    : pairs;
}

module.exports = { CHAPTER, KEYS, load, chapterUnits, merge, rank, byBookSection, citations, shape, hands, sum };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  console.log('═══ 中药化学 · 第 3 章 中药的炮制与制剂 ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike} · 数字字符 ${s.digits}`);
  console.log('\n按教材章：');
  for (const sec of byBookSection(list)) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log('\n三辨重心：');
  for (const v of rank(merge(list, 'views'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n四位面覆盖：');
  for (const v of rank(merge(list, 'levels'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  const c = citations(list);
  console.log(`\n引书 ${c.books} 部 · 引用 ${c.total} 次 · 前三：${c.top.map(([n, k]) => `${n}(${k})`).join('、')}`);
  console.log('\n操作词命中：' + hands(list).map(([w, k]) => `${w}×${k}`).join('  '));
  for (const u of list) console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字`);
  console.log('※ 教学样例：数字由 standards/linchuang-zhongyao/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
