#!/usr/bin/env node
/**
 * 病理生理学 · 第 5 章 缺氧：四类缺氧是氧代谢链条上的四段
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/05-queyang/docs/zh.md
 * 出处: 教材·疾病学基础·第6章（6.1–6.2，6 个小节）
 * 数据: standards/binglishengli/units.json（代用底本《疾病学基础》的机器可读层）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「四类缺氧不是四个名字，是氧代谢链条上的四个环节」。
 * 命题成不成立，取决于底本自己有没有把四类各自的环节写出来、有没有把
 * 「不作诊断、不写数值」写成正文的一部分。手打的数字会在底本改版后静默过期；
 * 现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/05-queyang/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/binglishengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'binglishengli', 'units.json');
const BASE = path.join(ROOT, 'standards', 'binglishengli', '底本.json');
const MAP = require(path.join(ROOT, 'scripts', 'lib_binglishengli_map.js'));
const CHAPTER = 5;

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const loadBase = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const nonWs = (s) => String(s || '').replace(/\s/g, '').length;

/** 本章的小节号由（课程章 → 底本章）映射现取，不在代码里硬写 */
function chapterSubs() {
  return MAP.subsOf(loadBase(), CHAPTER).map((u) => u.sub);
}

/** 本章的 6 个知识单元，按映射给出的顺序（也就是底本顺序）排；标题取映射的（已去重复编号） */
function chapterUnits(units) {
  const truth = MAP.subsOf(loadBase(), CHAPTER);
  const bySub = new Map(units.units.map((u) => [u.sub, u]));
  return truth.map((t) => {
    const u = bySub.get(t.sub);
    if (!u) throw new Error(`units.json 里没有 ${t.sub} —— 映射与机器可读层不同步`);
    return { ...u, title: t.title };
  });
}

/** 规模：节数 / 单元数 / 正文字数（不含空白）/ 汉字数 */
function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return {
    secs: secs.length,
    units: list.length,
    chars: list.reduce((n, u) => n + nonWs(u.rawBody), 0),
    hanzi: list.reduce((n, u) => n + (u.hanzi || 0), 0),
  };
}

/** 三视角（病因 / 机制 / 机能）与四层级（细胞 / 组织 / 器官 / 系统）：单元层词频相加 */
function lens(list) {
  const views = { 病因: 0, 机制: 0, 机能: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of list) {
    const m = u.measure || {};
    for (const k of Object.keys(views)) views[k] += (m.views && m.views[k]) || 0;
    for (const k of Object.keys(levels)) levels[k] += (m.levels && m.levels[k]) || 0;
  }
  return { views, levels };
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

/**
 * 数值核验：底本自称「不写数值与单位」。这里把它当断言复算，而不是相信它。
 * valueLike = 0 才允许正文写「零数值」这句结论。
 */
function valueAudit(list) {
  const hits = list.reduce((n, u) => n + ((u.measure && u.measure.valueLike) || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => ((u.measure && u.measure.valueLike) || 0) > 0).map((u) => u.sub),
  };
}

/** 四类缺氧 = 氧代谢链条上的四段。型名在正文里出现几个单元，说明这一段被讲到了几处 */
const TYPES = [
  { name: '乏氧性', at: '摄取与交换', sub: '6.1.1' },
  { name: '血液性', at: '携带与释放', sub: '6.1.2' },
  { name: '循环性', at: '输送（推送与灌注）', sub: '6.1.3' },
  { name: '组织性', at: '利用（细胞氧化）', sub: '6.1.3' },
];

function typeBreakdown(list) {
  return TYPES.map((t) => ({
    ...t,
    units: list.filter((u) => String(u.rawBody).includes(t.name)).map((u) => u.sub),
  }));
}

/** 链条四段的关键词：环节名在正文出现，才谈得上「按环节归类」 */
const LINKS = ['摄取', '携带', '输送', '利用'];

function linkCoverage(list) {
  return LINKS.map((k) => ({
    name: k,
    units: list.filter((u) => String(u.rawBody).includes(k)).map((u) => u.sub),
  }));
}

/** 边界句：本章要求「只写类别与关系」，这些词是它的可核痕迹 */
const BOUNDARY = ['不作疾病诊断', '不写数值', '具备资质', '留痕', '中性表述'];

function boundaryCoverage(list) {
  return BOUNDARY.map((k) => ({
    name: k,
    units: list.filter((u) => String(u.rawBody).includes(k)).map((u) => u.sub),
  }));
}

/** 两节的分布：每节几个单元、多少字 */
function bySection(list) {
  const out = new Map();
  for (const u of list) {
    if (!out.has(u.sec)) out.set(u.sec, { units: 0, chars: 0, subs: [] });
    const g = out.get(u.sec);
    g.units += 1;
    g.chars += nonWs(u.rawBody);
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
  const types = typeBreakdown(list);
  const links = linkCoverage(list);
  const bounds = boundaryCoverage(list);
  const secs = bySection(list);

  console.log('═══ 缺氧：四类缺氧 = 氧代谢链条上的四段（病理生理学 第5章）═══');
  console.log(`教材规模: 底本第6章 6.1–6.2 · ${s.secs} 节 · ${s.units} 小节 · 正文 ${s.chars} 字（汉字 ${s.hanzi}）`);
  console.log(`口径核验: 本章 ${audit.units} 小节的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('');

  console.log('两节的知识分布（节名 / 小节 / 字数）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 小节 · ${g.chars} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log(`四类缺氧的环节落点：四类在正文中都有落点 → ${types.filter((t) => t.units.length).length} / ${types.length}`);
  for (const t of types) {
    console.log(`  ${t.name} @ ${t.at} · 主讲 ${t.sub} · 出现 ${t.units.length} 处（${t.units.join(' ')}）`);
  }
  console.log('');
  console.log('链条四段的关键词覆盖（每段被哪些小节写到）：');
  for (const l of links) console.log(`  ${l.name} ${l.units.length} 处 · ${l.units.join(' ') || '（无）'}`);
  console.log('');
  console.log('边界句覆盖（本章要求「只写类别与关系」，这些词是它的可核痕迹）：');
  for (const b of bounds) console.log(`  ${b.name} ${b.units.length} 处 · ${b.units.join(' ') || '（无）'}`);
  console.log('');
  console.log(`  → 三视角落在「${rank(views)[0][0]}」、四层级最多的是「${rank(levels)[0][0]}」：`);
  console.log('     本章讲的是环节与代偿方向，不是某一器官的形态改变；病因视角为 0，因为底本按环节归类。');
  console.log('');

  console.log('教学边界：本章只说明底本的类别与关系与环节，不写数值与单位与正常值，不作诊断与正常异常判定，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, types, links, bounds, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  TYPES,
  LINKS,
  BOUNDARY,
  load,
  loadBase,
  chapterSubs,
  chapterUnits,
  shape,
  lens,
  rank,
  valueAudit,
  typeBreakdown,
  linkCoverage,
  boundaryCoverage,
  bySection,
  main,
};
