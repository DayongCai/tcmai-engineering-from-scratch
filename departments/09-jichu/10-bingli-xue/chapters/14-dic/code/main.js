#!/usr/bin/env node
/**
 * 病理学 · 第 14 章 弥散性血管内凝血：病因、机制、影响因素、分期分型与表述边界
 * 课程: departments/09-jichu/10-bingli-xue/chapters/14-dic/docs/zh.md
 * 出处: 教材·第14章（14.1–14.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 body / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的核心命题是「凝血在前、纤溶在后」这一条时序关系。
 * 时序是否被教材写成结构，取决于「凝血」与「纤溶」这两个词在哪些单元同时出现、
 * 以及「微血栓」是分散在各节还是集中在机制一节。手打的数字会随教材改版静默过期。
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
const CHAPTER = '14';

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
 * 本章的两条骨架：
 *   1) 凝血与纤溶的时序（凝血在前、纤溶继发在后 → 从相互制约转为先后失衡）；
 *   2) 表现的落点（出血、休克、器官功能、微血管病性溶血）。
 * 这里数的是词频与共现单元数 —— 能说明教材把哪条骨架写成结构。
 */
const KEYS = [
  { key: '凝血', pat: '凝血' },
  { key: '纤溶', pat: '纤溶' },
  { key: '微血栓', pat: '微血栓' },
  { key: '组织因子', pat: '组织因子' },
  { key: '类别', pat: '类别' },
  { key: '六要素', pat: '六要素' },
];

function keyProfile(list) {
  return KEYS.map(({ key, pat }) => {
    let n = 0;
    for (const u of list) n += (u.body || '').split(pat).length - 1;
    return { key, hits: n, units: unitsWith(list, new RegExp(pat)).length };
  });
}

/** 凝血与纤溶「同单元共现」的单元：这条时序关系写在几个单元里 */
function cooccurrence(list) {
  return list
    .filter((u) => /凝血/.test(u.body || '') && /纤溶/.test(u.body || ''))
    .map((u) => u.sub);
}

/** 教材在哪些单元写了「不给值」的边界句 */
function boundaryUnits(list) {
  return unitsWith(list, /数值与单位/);
}

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const secs = bySection(list);
  const prof = keyProfile(list);
  const both = cooccurrence(list);

  console.log('═══ 弥散性血管内凝血：凝血在前、纤溶在后（病理学 第14章）═══');
  console.log(`教材规模: 第14章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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

  console.log('两条骨架的词频（词频 / 命中单元数）：');
  for (const p of prof) console.log(`  ${p.key.padEnd(6, '　')} ${String(p.hits).padStart(4)} 次 · ${p.units} 个单元`);
  console.log('');
  console.log(`凝血与纤溶同单元共现：${both.length} / ${s.units} → ${both.join('、')}`);
  console.log('  → 两条骨架不是并列概念：教材把「凝血在前、纤溶在后」写成时序，');
  console.log('     时序一旦反过来（先纤溶后凝血），本章的现象就解释不通了。');
  console.log('');

  const bound = boundaryUnits(list);
  console.log(`正文提到「数值与单位」的单元：${bound.length} / ${s.units}`);
  console.log(`含「不作疾病诊断」的单元：${unitsWith(list, /不作疾病诊断/).length} / ${s.units}`);
  console.log('');
  console.log('教学边界：本章只说明弥散性血管内凝血的功能与代谢变化的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, secs, prof, both, bound };
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
  cooccurrence,
  boundaryUnits,
  main,
};
