#!/usr/bin/env node
/**
 * 病理生理学 · 第 6 章 发热：调定点上移是分期的唯一尺度
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/06-fare/docs/zh.md
 * 出处: 教材·疾病学基础·第6章（6.3–6.4，6 个小节）
 * 数据: standards/binglishengli/units.json（代用底本《疾病学基础》的机器可读层）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「三个分期不是三种表现，而是调定点与体温的三种相对位置」。
 * 命题成不成立，取决于底本有没有把「调定点高于体温 / 大体相当 / 低于体温」三句写进正文，
 * 以及它有没有在讲机制的同时把数值与判定排除在外。手打的数字会静默过期；
 * 现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
const CHAPTER = 6;

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const loadBase = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const nonWs = (s) => String(s || '').replace(/\s/g, '').length;

function chapterSubs() {
  return MAP.subsOf(loadBase(), CHAPTER).map((u) => u.sub);
}

function chapterUnits(units) {
  const truth = MAP.subsOf(loadBase(), CHAPTER);
  const bySub = new Map(units.units.map((u) => [u.sub, u]));
  return truth.map((t) => {
    const u = bySub.get(t.sub);
    if (!u) throw new Error(`units.json 里没有 ${t.sub} —— 映射与机器可读层不同步`);
    return { ...u, title: t.title };
  });
}

function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return {
    secs: secs.length,
    units: list.length,
    chars: list.reduce((n, u) => n + nonWs(u.rawBody), 0),
    hanzi: list.reduce((n, u) => n + (u.hanzi || 0), 0),
  };
}

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

function valueAudit(list) {
  const hits = list.reduce((n, u) => n + ((u.measure && u.measure.valueLike) || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => ((u.measure && u.measure.valueLike) || 0) > 0).map((u) => u.sub),
  };
}

/** 第一层：致热原的类别。前段与后段是链条上的先后，不是并列的同义词 */
const PYROGENS = [
  { name: '外源性', at: '链条前段（经内源性一类起作用）', sub: '6.3.1' },
  { name: '内源性', at: '链条后段（作用于中枢环节）', sub: '6.3.1' },
];

/** 第二层：体温调节的三个环节。发热的关键变化落在中枢环节 */
const LINKS = [
  { name: '感受环节', at: '把温度信息转换为神经信号' },
  { name: '中枢环节', at: '整合信息并设定调定点' },
  { name: '效应环节', at: '按调定点调整产热与散热' },
];

/** 第三层：三个分期 = 调定点与体温的三种相对位置 */
const STAGES = [
  { name: '体温上升期', rel: '调定点高于体温', net: '产热多于散热', sub: '6.4.1' },
  { name: '高热持续期', rel: '两者大体相当', net: '产热与散热相对平衡', sub: '6.4.2' },
  { name: '退热期', rel: '调定点低于体温', net: '散热多于产热', sub: '6.4.3' },
];

function cover(list, keys) {
  return keys.map((k) => {
    const o = typeof k === 'string' ? { name: k } : k;
    return { ...o, units: list.filter((u) => String(u.rawBody).includes(o.name)).map((u) => u.sub) };
  });
}

const BOUNDARY = ['不作疾病诊断', '不写数值', '具备资质', '留痕', '中性表述'];

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
  const pyro = cover(list, PYROGENS);
  const links = cover(list, LINKS);
  const stages = cover(list, STAGES);
  const setpoint = cover(list, ['调定点']);
  const bounds = cover(list, BOUNDARY);
  const secs = bySection(list);

  console.log('═══ 发热：调定点上移是分期的唯一尺度（病理生理学 第6章）═══');
  console.log(`教材规模: 底本第6章 6.3–6.4 · ${s.secs} 节 · ${s.units} 小节 · 正文 ${s.chars} 字（汉字 ${s.hanzi}）`);
  console.log(`口径核验: 本章 ${audit.units} 小节的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('  → 四层级近乎为空：本章的坐标是「环节」，不是「层级」。');
  console.log('');

  console.log('两节的知识分布（节名 / 小节 / 字数）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 小节 · ${g.chars} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('第一层 · 致热原的类别：');
  for (const p of pyro) console.log(`  ${p.name} @ ${p.at} · 主讲 ${p.sub} · 出现 ${p.units.length} 处（${p.units.join(' ')}）`);
  console.log('第二层 · 体温调节的三个环节：');
  for (const l of links) {
    const g = l;
    const n = list.filter((u) => String(u.rawBody).includes(g.name)).length;
    console.log(`  ${g.name} @ ${g.at} · 出现 ${n} 处`);
  }
  console.log('第三层 · 三个分期 = 调定点与体温的三种相对位置：');
  for (const t of stages) console.log(`  ${t.name} · ${t.rel} → ${t.net} · 主讲 ${t.sub} · 出现 ${t.units.length} 处`);
  console.log(`调定点覆盖：${setpoint[0].units.length} / ${s.units} 个小节（${setpoint[0].units.join(' ')}）`);
  console.log('');
  console.log('边界句覆盖（本章要求「只写环节与类别」，这些词是它的可核痕迹）：');
  for (const b of bounds) console.log(`  ${b.name} ${b.units.length} 处 · ${b.units.join(' ') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明底本的类别与关系与环节，不写数值与单位与正常值，不作诊断与正常异常判定，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, pyro, links, stages, setpoint, bounds, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  PYROGENS,
  LINKS,
  STAGES,
  BOUNDARY,
  load,
  loadBase,
  chapterSubs,
  chapterUnits,
  shape,
  lens,
  rank,
  valueAudit,
  cover,
  bySection,
  main,
};
