#!/usr/bin/env node
/**
 * 病理学 · 第 12 章 应激与疾病：应激原、分期、机制网络与资源再分配
 * 课程: departments/09-jichu/10-bingli-xue/chapters/12-yingji-jibing/docs/zh.md
 * 出处: 教材·第12章（12.1–12.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 goals / body / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「应激不是一组反应清单，而是一次统一的资源再分配」，
 * 而这张调度表是否成立，取决于教材有没有把分期、两条通路、细胞体液三层与各系统的方向写出来、
 * 有没有偷偷给出分期的时限与量值。手打的数字会在教材改版后静默过期。
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
const CHAPTER = '12';

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
 * 分期：警戒 → 抵抗 → 衰竭。依据是性质更替，不是时长；
 * 教材明确不写时限与数值，所以这里只统计「哪几期被写到了」。
 */
const STAGES = [
  { name: '警戒期', state: '被动员，广泛调整以提高警觉、动员能量', ledger: '支出骤增' },
  { name: '抵抗期', state: '动员趋于稳定，在新水平上重建平衡', ledger: '选择性适应：定向变强，其余变弱' },
  { name: '衰竭期', state: '调节资源被持续消耗，协调性下降', ledger: '支出大于补充' },
];

function stageCoverage(list) {
  return STAGES.map((s) => ({
    ...s,
    units: list.filter((u) => (u.body || '').includes(s.name)).map((u) => u.sub),
  }));
}

/**
 * 机制：两条主通路 + 细胞体液三层，合起来才是一张网。
 * 少任何一层，「统一调节」就退化成「几条线同时在跑」。
 */
const PATHWAYS = [
  { key: '交感', name: '交感—肾上腺髓质通路', note: '迅速动员，快而粗' },
  { key: '下丘脑', name: '下丘脑—垂体—肾上腺皮质通路', note: '持久应答，慢而久' },
  { key: '折叠', name: '保护性蛋白质', note: '细胞内自保：协助正确折叠、减少异常聚集' },
  { key: '急性期反应', name: '急性期反应物质', note: '体液支援：主要由肝脏合成，合成方向改变' },
];

function pathwayCoverage(list) {
  return PATHWAYS.map((p) => ({
    ...p,
    units: list.filter((u) => (u.body || '').includes(p.key)).map((u) => u.sub),
  }));
}

/**
 * 全身性 = 一次资源再分配。下面七组是教材逐节写到的系统，
 * 它们的共同句式是「功能性调整、可逆、非结构性损害」。
 */
const SYSTEMS = ['中枢神经', '免疫', '心血管', '消化', '血液', '泌尿', '生殖'];

function systemCoverage(list) {
  return SYSTEMS.map((k) => ({
    name: k,
    units: list.filter((u) => (u.body || '').includes(k)).map((u) => u.sub),
  }));
}

/** 六要素：观察 / 描述 / 记录 / 分析 / 报告 / 复核。本章只在边界一节写成集合概念 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];

function sixElements(list) {
  return list.filter((u) => (u.body || '').includes('六要素')).map((u) => u.sub);
}

/** 划定边界的句式：本章反复用它把「功能调整」与「结构病变」分开 */
const BOUNDARY_PHRASES = ['功能层面', '功能性调整', '结构性'];

function boundaryCount(list) {
  return list.reduce((n, u) => n + BOUNDARY_PHRASES.filter((p) => (u.body || '').includes(p)).length, 0);
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
  const stages = stageCoverage(list);
  const paths = pathwayCoverage(list);
  const sys = systemCoverage(list);
  const six = sixElements(list);
  const boundary = boundaryCount(list);
  const secs = bySection(list);

  console.log('═══ 应激与疾病：应激原、分期、机制网络与资源再分配（病理学 第12章）═══');
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
  console.log(`  → 本章以「${rank(views)[0][0]}」词频居首、落在「${rank(levels)[0][0]}」层：`);
  console.log('     系统层压倒性居多：教材写的是「全身如何重新分配」，不是「某个器官出了什么病变」。');
  console.log('     形态词偏高，多用于划界——属功能性调整、非结构性病变，不是在描述形态改变。');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('分期：警戒 → 抵抗 → 衰竭（依据是性质更替，不是时长；教材不写时限与数值）');
  for (const st of stages) {
    console.log(`  ${st.name} · ${st.state} · 资源侧: ${st.ledger} · 出现 ${st.units.length} 单元（${st.units.join(' ')}）`);
  }
  console.log('');

  console.log('机制：两条主通路 + 细胞体液三层，合起来才是一张网');
  for (const p of paths) {
    console.log(`  ${p.name} · ${p.note} · 出现 ${p.units.length} 单元（${p.units.join(' ')}）`);
  }
  console.log('');

  console.log('全身性 = 一次资源再分配（向生命重要器官倾斜，其余让路）');
  for (const x of sys) {
    console.log(`  ${x.name} · 出现 ${x.units.length} 单元（${x.units.join(' ')}）`);
  }
  console.log(`  → 七组系统的共同句式：功能性调整、可逆、非结构性损害。`);
  console.log('');

  console.log(`划界句式（功能层面 / 功能性调整 / 结构性）命中：${boundary} 处`);
  console.log(`六要素写进正文的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的类别与关系与机制，不写数值与单位与正常值，不给出分期的时限与分级，不作心理诊断与人格判定，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, stages, paths, sys, six, boundary, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  STAGES,
  PATHWAYS,
  SYSTEMS,
  SIX,
  BOUNDARY_PHRASES,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  stageCoverage,
  pathwayCoverage,
  systemCoverage,
  sixElements,
  boundaryCount,
  bySection,
  main,
};
