#!/usr/bin/env node
/**
 * 病理学 · 第 11 章 发热：调定点、四段机制链与三个时相
 * 课程: departments/09-jichu/10-bingli-xue/chapters/11-fare/docs/zh.md
 * 出处: 教材·第11章（11.1–11.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 goals / body / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「三个时相不是时间刻度，是调定点与实际体温之差」，
 * 而这条差是否讲得通，取决于教材有没有把机制链的四段与三个时相的方向都写出来、
 * 有没有偷偷给出体温值、分级界线与降温参数。手打的数字会在教材改版后静默过期。
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
const CHAPTER = '11';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
}

function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return {
    secs: secs.length,
    units: list.length,
    hanzi: list.reduce((n, u) => n + u.hanzi, 0),
  };
}

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

/**
 * 机制链四段：激活物 →（产致热原细胞）→ 内生致热原 → 中枢介质 → 调定点上移。
 * 四段缺一段，链条就退化成「因为有致热原」。
 */
const CHAIN = [
  { key: '发热激活物', at: '启动段', role: '作用于产致热原细胞，不直接作用于中枢' },
  { key: '内生致热原', at: '中段', role: '产致热原细胞释放，靶向体温调节中枢' },
  { key: '中枢介质', at: '中枢段', role: '内生致热原借介质改变调定点' },
  { key: '调定点', at: '效应段', role: '设定值上移，产热与散热随之改向' },
];

function chainCoverage(list) {
  return CHAIN.map((c) => ({
    ...c,
    units: list.filter((u) => (u.body || '').includes(c.key)).map((u) => u.sub),
  }));
}

/**
 * 三个时相：划分依据是热代谢的方向，而方向由「调定点 − 实际体温」之差决定。
 * 差为正 → 上升期；差近零 → 持续期；差为负 → 下降期。
 */
const PHASES = [
  { name: '体温上升期', gap: '差为正', flux: '产热相对增加、散热相对减少' },
  { name: '高温持续期', gap: '差近于零', flux: '在新的水平上相对平衡' },
  { name: '体温下降期', gap: '差为负', flux: '散热相对增加、产热相对减少' },
];

function phaseCoverage(list) {
  return PHASES.map((p) => ({
    ...p,
    units: list.filter((u) => (u.body || '').includes(p.name)).map((u) => u.sub),
  }));
}

/** 三个「体温高」的类别：判据只有一个——调定点有没有上移 */
const CATEGORIES = [
  { name: '发热', setpoint: '上移' },
  { name: '过热', setpoint: '未上移（调节失效或散热受阻）' },
  { name: '生理性体温升高', setpoint: '未上移（运动、情绪）' },
];

function categoryCoverage(list) {
  return CATEGORIES.map((c) => ({
    ...c,
    units: list.filter((u) => (u.body || '').includes(c.name)).map((u) => u.sub),
  }));
}

/** 六要素：观察 / 描述 / 记录 / 分析 / 报告 / 复核。本章把它写成集合概念的单元 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];

function sixElements(list) {
  return list.filter((u) => (u.body || '').includes('六要素')).map((u) => u.sub);
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

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const chain = chainCoverage(list);
  const phases = phaseCoverage(list);
  const cats = categoryCoverage(list);
  const six = sixElements(list);
  const secs = bySection(list);

  console.log('═══ 发热：调定点、四段机制链与三个时相（病理学 第11章）═══');
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
  console.log('     发热讲的是「通路怎么走、系统怎么被调动」，不是「组织发生了什么形态改变」。');
  console.log('     （组织层最低：发热不在组织学层面展开，这是本章的尺度选择，不是遗漏。）');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log(`机制链四段：启动 → 中段 → 中枢 → 效应，四段都在正文出现 → ${chain.filter((c) => c.units.length).length} / ${chain.length}`);
  for (const c of chain) {
    console.log(`  ${c.key} @ ${c.at} · ${c.role} · 出现 ${c.units.length} 单元（${c.units.join(' ')}）`);
  }
  console.log('');

  console.log('三个时相：划分依据是热代谢方向，方向由「调定点 − 实际体温」之差决定');
  for (const p of phases) {
    console.log(`  ${p.name} · ${p.gap} · ${p.flux} · 出现 ${p.units.length} 单元（${p.units.join(' ')}）`);
  }
  console.log('');

  console.log('三个「体温高」的类别：判据只有一条——调定点有没有上移');
  for (const c of cats) {
    console.log(`  ${c.name} · 调定点${c.setpoint} · 出现 ${c.units.length} 单元（${c.units.join(' ')}）`);
  }
  console.log('');

  console.log(`六要素（观察/描述/记录/分析/报告/复核）写进正文的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的类别与关系与机制，不写数值与单位与正常值，不给出体温值与分级界线与降温参数，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, chain, phases, cats, six, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  CHAIN,
  PHASES,
  CATEGORIES,
  SIX,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  chainCoverage,
  phaseCoverage,
  categoryCoverage,
  sixElements,
  bySection,
  main,
};
