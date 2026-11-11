#!/usr/bin/env node
/**
 * 中医儿科学 · 第 14 章 儿科急症与数字化AI时代：本章统计口径
 * 课程: departments/01-zhongyi/13-zhongyi-erke-xue/chapters/14-jizhen-shuzihua/docs/zh.md
 * 数据: standards/erke/units.json（250 单元层，每单元带三辨 / 四位面词频与数值计数）
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
    if (fs.existsSync(path.join(dir, 'standards', 'erke', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/erke/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'erke', 'units.json');
const CHAPTER = '14';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);

function merge(list, field) {
  const out = {};
  for (const u of list) for (const [k, v] of Object.entries(u.measure[field])) out[k] = (out[k] || 0) + v;
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

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

function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) {
      counter.set(m[1], (counter.get(m[1]) || 0) + 1);
    }
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

/** 方与法：单元层没有独立方剂字段，改从正文里认「治法动词」记号（儿科以疏风宣肺、消食健脾、平肝息风为主） */
function methods(list) {
  const VERBS = ['疏风', '清热', '解毒', '消食', '健脾', '运化', '补肾', '平肝', '息风', '透疹', '止泻', '宣肺'];
  const out = {};
  for (const v of VERBS) out[v] = list.reduce((a, u) => a + u.prose.split(v).length - 1, 0);
  return Object.entries(out).filter(([, c]) => c).sort((a, b) => b[1] - a[1]);
}

module.exports = { CHAPTER, load, chapterUnits, merge, rank, bySection, citations, shape, methods, sum };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  const views = rank(merge(list, 'views'));
  const levels = rank(merge(list, 'levels'));
  const books = citations(list);

  console.log('═══ 中医儿科学 · 第 14 章 儿科急症与数字化AI时代 ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike} · 数字字符 ${s.digits}`);
  console.log('\n按节：');
  for (const sec of bySection(list)) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log('\n三辨重心：');
  for (const v of views) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n四位面覆盖：');
  for (const v of levels) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log(`\n引书 ${books.books} 部 · 引用 ${books.total} 次 · 前三：${books.top.map(([n, c]) => `${n}(${c})`).join('、')}`);
  console.log('\n治法动词命中：' + methods(list).map(([v, c]) => `${v}×${c}`).join('  '));
  console.log('\n单元清单：');
  for (const u of list) {
    console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字\t${u.tri.view.primary || '—'}/${u.tri.level.primary || '—'}`);
  }
}

// 教学样例声明：契约要求每章输出含临床边界声明（tests/test_chapter_code.js）
if (require.main === module) {
  console.log('※ 教学样例：数字由 standards/erke/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
