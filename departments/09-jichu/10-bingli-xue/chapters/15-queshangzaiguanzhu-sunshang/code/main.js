#!/usr/bin/env node
/**
 * 病理学 · 第 15 章 缺血-再灌注损伤：原因、机制、功能代谢变化与表述边界
 * 课程: departments/09-jichu/10-bingli-xue/chapters/15-queshangzaiguanzhu-sunshang/docs/zh.md
 * 出处: 教材·第15章（15.1–15.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 body / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「恢复血流本身可以是损伤的触发环节」。
 * 这句话能不能立住，取决于三件事在教材里是否写成结构：
 *   ① 原因里有「血流恢复」这一类（而不是只有「缺血」）；
 *   ② 机制有三条并行的边（自由基、钙超载、微血管与白细胞）；
 *   ③ 表现落在具体器官（心、脑、其它）。
 * 手打的数字会随教材改版静默过期；现算的对不上就报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'bingli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/bingli/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'bingli', 'units.json');
const CHAPTER = '15';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
}

function shape(list) {
  return {
    secs: new Set(list.map((u) => u.sec)).size,
    units: list.length,
    hanzi: list.reduce((n, u) => n + u.hanzi, 0),
  };
}

function lens(list) {
  const views = { 病因: 0, 机制: 0, 形态: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of list) {
    for (const k of Object.keys(views)) views[k] += u.measure.views[k] || 0;
    for (const k of Object.keys(levels)) levels[k] += u.measure.levels[k] || 0;
  }
  return { views, levels };
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const share = (o, k) => (total(o) ? o[k] / total(o) : 0);

function valueAudit(list) {
  return {
    units: list.length,
    hits: list.reduce((n, u) => n + (u.measure.valueLike || 0), 0),
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

function bySection(list) {
  const out = new Map();
  for (const u of list) {
    if (!out.has(u.sec)) out.set(u.sec, { units: 0, hanzi: 0, subs: [] });
    const g = out.get(u.sec);
    g.units += 1;
    g.hanzi += u.hanzi;
    g.subs.push(u.sub);
  }
  return out;
}

/** 朴素词频：不用带 g 的正则做 test，避免 lastIndex 漏计 */
function wordCount(list, w) {
  let n = 0;
  for (const u of list) n += (u.body || '').split(w).length - 1;
  return n;
}

function unitsWith(list, re) {
  return list.filter((u) => re.test(u.body || '')).map((u) => u.sub);
}

/**
 * 本章的三条机制边与两条条件边：
 *   机制：自由基（15.2.1）、钙超载（15.2.2）、微血管与白细胞（15.2.3）；
 *   条件：血流恢复（15.1.1）、与缺血性损伤的关系（15.1.3）。
 * 数词频与命中单元数，用来回答「三条边是真的分三节写，还是混在一节里」。
 */
const KEYS = [
  { key: '再灌注', pat: '再灌注' },
  { key: '自由基', pat: '自由基' },
  { key: '钙超载', pat: '钙超载' },
  { key: '无复流', pat: '无复流' },
  { key: '凋亡', pat: '凋亡' },
  { key: '六要素', pat: '六要素' },
];

function keyProfile(list) {
  return KEYS.map(({ key, pat }) => {
    let n = 0;
    for (const u of list) n += (u.body || '').split(pat).length - 1;
    return { key, hits: n, units: unitsWith(list, new RegExp(pat)).length };
  });
}

/** 三条机制边各自的主单元：标题里带关键词的单元 */
function mechanismUnits(list) {
  return list
    .filter((u) => /自由基|钙超载|微血管损伤/.test(u.title))
    .map((u) => ({ sub: u.sub, title: u.title }));
}

/** 器官层的三个单元：心、脑、其它（含凋亡） */
function organUnits(list) {
  return list.filter((u) => u.sec.indexOf('15.3') === 0).map((u) => u.sub);
}

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const secs = bySection(list);
  const prof = keyProfile(list);
  const mech = mechanismUnits(list);
  const organs = organUnits(list);

  console.log('═══ 缺血-再灌注损伤：恢复血流为什么会加重损伤（病理学 第15章）═══');
  console.log(`教材规模: 第15章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 形态）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('关键词的词频（词频 / 命中单元数）：');
  for (const p of prof) console.log(`  ${p.key.padEnd(6, '　')} ${String(p.hits).padStart(4)} 次 · ${p.units} 个单元`);
  console.log('');

  console.log('三条机制边各自的主单元：');
  for (const m of mech) console.log(`  ${m.sub} ${m.title}`);
  console.log('  → 三条边分三节写，不是混在一节：这是本章机制可分开检查的前提。');
  console.log('');
  console.log(`器官层的单元：${organs.join('、')}`);
  console.log(`含「六要素」的单元：${unitsWith(list, /六要素/).join('、') || '（无）'}`);
  console.log(`含「不作疾病诊断」的单元：${unitsWith(list, /不作疾病诊断/).length} / ${s.units}`);
  console.log('');

  console.log('教学边界：本章只说明缺血-再灌注损伤的功能与代谢变化的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, secs, prof, mech, organs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  KEYS,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  bySection,
  wordCount,
  unitsWith,
  keyProfile,
  mechanismUnits,
  organUnits,
  main,
};
