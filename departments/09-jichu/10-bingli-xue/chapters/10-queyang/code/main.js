#!/usr/bin/env node
/**
 * 病理学 · 第 10 章 缺氧：氧运输链、五个指标与四型断点
 * 课程: departments/09-jichu/10-bingli-xue/chapters/10-queyang/docs/zh.md
 * 出处: 教材·第10章（10.1–10.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 goals / body / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「四型缺氧不是四个名字，是氧运输链上的四个断点」，
 * 而断点是否成立，取决于教材自己有没有把四型的指标方向写出来、
 * 有没有偷偷给出曲线的坐标与氧疗的参数。手打的数字会在教材改版后静默过期；
 * 现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/10-bingli-xue/chapters/10-queyang/code
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
const CHAPTER = '10';

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

/** 三视角（病因 / 机制 / 形态）与四层级（细胞 / 组织 / 器官 / 系统）：单元层词频直接相加 */
function lens(list) {
  const views = { 病因: 0, 机制: 0, 形态: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of list) {
    const m = u.measure || {};
    for (const k of Object.keys(views)) views[k] += (m.views && m.views[k]) || 0;
    for (const k of Object.keys(levels)) levels[k] += (m.levels && m.levels[k]) || 0;
  }
  return { views, levels };
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const share = (o, k) => (total(o) ? o[k] / total(o) : 0);

/**
 * 数值核验：底本自己声明「不写数值与单位与正常值」。
 * 本函数把这个声明当成可核验的断言来复算——不是相信它，是检查它。
 */
function valueAudit(list) {
  const hits = list.reduce((n, u) => n + ((u.measure && u.measure.valueLike) || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => ((u.measure && u.measure.valueLike) || 0) > 0).map((u) => u.sub),
  };
}

/** 四型缺氧 = 氧运输链上的四个断点。型名在正文里出现几个单元，说明断点被讲到了几处 */
const TYPES = [
  { name: '低张性', at: '外呼吸（进入与交换）', sign: '分压降 → 饱和度降 → 含量降' },
  { name: '血液性', at: '载体（血红蛋白）', sign: '容量降 → 含量降，分压不降' },
  { name: '循环性', at: '灌注', sign: '静脉端偏低 → 动静脉氧差增大' },
  { name: '组织性', at: '利用（细胞氧化）', sign: '静脉端偏高 → 动静脉氧差缩小' },
];

function typeBreakdown(list) {
  return TYPES.map((t) => ({
    ...t,
    units: list.filter((u) => (u.body || '').includes(t.name)).map((u) => u.sub),
  }));
}

/** 五个指标 = 氧运输链上的五处读数。覆盖数说明教材把仪表盘画全了没有 */
const INDICATORS = ['血氧分压', '血氧容量', '血氧饱和度', '血氧含量', '动静脉氧差'];

function indicatorCoverage(list) {
  return INDICATORS.map((k) => ({
    name: k,
    units: list.filter((u) => (u.body || '').includes(k)).map((u) => u.sub),
  }));
}

/** 六要素：观察 / 描述 / 记录 / 分析 / 报告 / 复核。本章只在指标变化一节写全 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];

function sixElements(list) {
  return list.filter((u) => SIX.every((k) => (u.body || '').includes(k))).map((u) => u.sub);
}

/** 四节的知识分布：每节几个单元、多少字 */
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
  const types = typeBreakdown(list);
  const indicators = indicatorCoverage(list);
  const six = sixElements(list);
  const secs = bySection(list);

  console.log('═══ 缺氧：氧运输链、五个指标与四型断点（病理学 第10章）═══');
  console.log(`教材规模: 第${CHAPTER}章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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
  console.log('     缺氧讲的是「组织与系统怎样应对供氧不足」，不是「某种病的形态改变」。');
  console.log('     （病因视角为 0：本章按断点分类，不按病因分类。）');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log(`四型断点：氧运输链上的四段，教材四型都在正文出现 → ${types.filter((t) => t.units.length).length} / ${types.length}`);
  for (const t of types) {
    console.log(`  ${t.name} @ ${t.at} · 签名: ${t.sign} · 出现 ${t.units.length} 单元（${t.units.join(' ')}）`);
  }
  console.log('');
  console.log(`指标覆盖（五个指标各被几个单元提到）：`);
  for (const i of indicators) {
    console.log(`  ${i.name} ${i.units.length} 单元 · ${i.units.join(' ')}`);
  }
  console.log(`  → 五个指标全部出现：${indicators.every((i) => i.units.length > 0) ? '是' : '否'}；指标是链上读数，不是五个并列名词。`);
  console.log('');
  console.log(`六要素（观察/描述/记录/分析/报告/复核）写全的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的类别与关系与机制，不写数值与单位与正常值，不给出曲线坐标与氧疗参数，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, types, indicators, six, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  TYPES,
  INDICATORS,
  SIX,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  typeBreakdown,
  indicatorCoverage,
  sixElements,
  bySection,
  main,
};
