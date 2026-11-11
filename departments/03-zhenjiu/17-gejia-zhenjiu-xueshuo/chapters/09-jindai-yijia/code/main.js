#!/usr/bin/env node
/**
 * 各家针灸学说 · 第 9 章 近代针灸医家学术思想：本章统计口径
 * 课程: departments/03-zhenjiu/17-gejia-zhenjiu-xueshuo/chapters/09-jindai-yijia/docs/zh.md
 * 数据: standards/zhenjiu-gejia/units.json（138 单元层，每单元带三辨 / 四位面词频与数值计数）
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
    if (fs.existsSync(path.join(dir, 'standards', 'zhenjiu-gejia', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenjiu-gejia/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'zhenjiu-gejia', 'units.json');
const CHAPTER = '9';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units) {
  return units.units
    .filter((u) => u.chapter === CHAPTER)
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
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 5) };
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

/** 医家人名：从正文里认「某氏/某子/某山人」与已知医家名，给本章算一个可核的人物密度 */
function persons(list) {
  const NAMES = ['黄帝', '岐伯', '扁鹊', '华佗', '张仲景', '皇甫谧', '葛洪', '孙思邈', '王焘', '王惟一',
    '窦汉卿', '窦默', '滑寿', '刘完素', '张从正', '李东垣', '朱丹溪', '忽泰必烈', '王国瑞',
    '徐凤', '高武', '汪机', '李梃', '杨继洲', '吴谦', '廖润鸿', '承淡安', '陆瘦燕', '朱琏',
    '石学敏', '贺普仁', '程莘农', '郭诚杰'];
  const pairs = NAMES.map((n) => [n, list.reduce((a, u) => a + u.prose.split(n).length - 1, 0)]);
  return pairs.filter(([, c]) => c).sort((a, b) => b[1] - a[1]);
}

module.exports = { CHAPTER, load, chapterUnits, merge, rank, bySection, citations, shape, persons, sum };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  console.log('═══ 各家针灸学说 · 第 9 章 近代针灸医家学术思想 ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike} · 数字字符 ${s.digits}`);
  console.log('\n按节：');
  for (const sec of bySection(list)) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log('\n三辨重心：');
  for (const v of rank(merge(list, 'views'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n四位面（时代）：');
  for (const v of rank(merge(list, 'levels'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  const c = citations(list);
  console.log(`\n引书 ${c.books} 部 · 引用 ${c.total} 次 · 前五：${c.top.map(([n, k]) => `${n}(${k})`).join('、')}`);
  console.log('\n人物密度：' + persons(list).slice(0, 8).map(([n, k]) => `${n}×${k}`).join('  '));
  for (const u of list) console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字`);
  console.log('※ 教学样例：数字由 standards/zhenjiu-gejia/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
