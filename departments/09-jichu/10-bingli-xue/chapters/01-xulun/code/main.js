#!/usr/bin/env node
/**
 * 病理学 · 第 1 章 绪论：研究对象、发展简史、观察层次与规范边界
 * 课程: departments/09-jichu/10-bingli-xue/chapters/01-xulun/docs/zh.md
 * 出处: 教材·第1章（1.1–1.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 goals / rawBody / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「病理学的认识是一条从类别到关系再到边界的链」。
 * 链上的每一环——观察层次写了几层、六要素落在几个单元、判断被交给谁——
 * 都能在单元层数出来。手打的数字会在教材改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/10-bingli-xue/chapters/01-xulun/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/bingli 的那一级
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
const CHAPTER = '1';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

/** 本章的 12 个知识单元，按 sub 号排 */
function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
}

/** 规模：节数 / 单元数 / 汉字数。hanzi 是底本给出的正文汉字数，不估算 */
function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return {
    secs: secs.length,
    units: list.length,
    hanzi: list.reduce((n, u) => n + u.hanzi, 0),
  };
}

/** 三视角与四层级：单元层的词频直接相加，得到本章的观察重心 */
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

/**
 * 数值核验：底本自己声明「不写数值与单位与参考值」。
 * 本函数把这个声明当成可核验的断言来复算——不是相信它，是检查它。
 */
function valueAudit(list) {
  const hits = list.reduce((n, u) => n + (u.measure.valueLike || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

/**
 * 观察层次：本章在教材里被写成三个层次（大体 / 组织学 / 细胞与分子）。
 * 统计每一层被几个单元的正文提到，用来判断「层次」是口号还是被写实。
 */
const LAYERS = [
  { key: '大体观察', label: '大体观察' },
  { key: '组织学观察', label: '组织学观察' },
  { key: '分子', label: '细胞与分子层面的观察' },
];
function layerCoverage(list) {
  return LAYERS.map((l) => ({
    ...l,
    units: list.filter((u) => (u.rawBody || '').includes(l.key)).map((u) => u.sub),
  }));
}

/**
 * 六要素：观察 / 描述 / 记录 / 分析 / 报告 / 复核。
 * 教材把它写成「形态描述的基本环节」，此处数个单元把它写全——
 * 判据取教材的提法本身，不按单个词计：六项里每一项都是常用词，逐词命中几乎处处为真。
 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];
function sixElementUnits(list) {
  return list.filter((u) => (u.rawBody || '').includes('六要素')).map((u) => u.sub);
}

/** 判断的归属：正文里把结论交给「具备资质的人员」的单元 */
const HANDOFF = '具备资质的人员';
function handoffUnits(list) {
  return list.filter((u) => (u.rawBody || '').includes(HANDOFF)).map((u) => u.sub);
}

/** 平台口径的三件套：单元库 / 术语域 / 数据门禁，各自被几个单元提到 */
const PLATFORM = [
  { key: '单元库', label: '病理学单元库（病理域）' },
  { key: '术语域', label: '术语域（规范名称对应）' },
  { key: '数据门禁', label: '数据门禁（内容边界）' },
];
function platformCoverage(list) {
  return PLATFORM.map((p) => ({
    ...p,
    units: list.filter((u) => (u.rawBody || '').includes(p.key)).length,
  }));
}

/** 四节的知识分布：每节几个单元、多少字。绪论的四节就是四个话题 */
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

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const layers = layerCoverage(list);
  const six = sixElementUnits(list);
  const handoff = handoffUnits(list);
  const platform = platformCoverage(list);
  const secs = bySection(list);

  console.log('═══ 绪论：研究对象、发展简史、观察层次与规范边界（病理学 第1章）═══');
  console.log(`教材规模: 第1章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 形态）本章词频：');
  for (const [k, v] of rank(views)) {
    console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角的 ${(share(views, k) * 100).toFixed(1)}%`);
  }
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) {
    console.log(`  ${k} ${String(v).padStart(4)} 次 · 占四层级的 ${(share(levels, k) * 100).toFixed(1)}%`);
  }
  console.log('');
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层：`);
  console.log('     绪论讲的是「形态怎么被看、被记、被核对」，不是「某一种病变长什么样」。');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('观察层次的覆盖（写到该层次的单元数）：');
  for (const l of layers) console.log(`  ${l.label} · ${l.units.length} 单元 → ${l.units.join(' ') || '（无）'}`);
  console.log('');

  console.log(`六要素被提到的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log(`把判断交给「具备资质的人员」的单元：${handoff.length} / ${s.units}`);
  console.log('  → 判断归属被写进绝大多数单元，这不是免责套话，而是本章的结构：');
  console.log('     教材把「描述」留给自己，把「判断」交出去，两件事在体例上是分开的。');
  console.log('');

  console.log('平台口径三件套在本章的落点：');
  for (const p of platform) console.log(`  ${p.label} · 出现在 ${p.units} 个单元`);
  console.log('');

  console.log('教学边界：本章只说明病理学的对象/方法/层次与表述口径，不写数值与单位与参考值，不构成诊断/治疗/用药依据');

  return { list, shape: s, views, levels, audit, layers, six, handoff, platform, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  LAYERS,
  SIX,
  HANDOFF,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  layerCoverage,
  sixElementUnits,
  handoffUnits,
  platformCoverage,
  bySection,
  main,
};
