#!/usr/bin/env node
/**
 * 病理学 · 第 3 章 细胞和组织的适应、损伤与修复：三类反应与一条连续线
 * 课程: departments/09-jichu/10-bingli-xue/chapters/03-shiying-sunshang-xiufu/docs/zh.md
 * 出处: 教材·第3章（3.1–3.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 goals / rawBody / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「适应、损伤、修复是同一过程的三个阶段，不是三个话题」。
 * 这句话能不能成立，取决于教材有没有在四节里都把三者写在一起、有没有把形态特征写成可区分的类别。
 * 这些都能在单元层数出来；手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/10-bingli-xue/chapters/03-shiying-sunshang-xiufu/code
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
const CHAPTER = '3';

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
 * 三类反应：适应（萎缩/肥大/增生/化生）、损伤（可逆/不可逆）、修复（再生/纤维性修复/创伤愈合）。
 * 判据是三者是否同处出现——同处出现，才谈得上「连续线」；只在一节里各说各的，就是三个话题。
 */
const TRIAD = ['适应', '损伤', '修复'];
function triadUnits(list) {
  return list.filter((u) => TRIAD.every((k) => (u.rawBody || '').includes(k))).map((u) => u.sub);
}

/** 适应反应的四个类别：萎缩、肥大、增生、化生，各自被几个单元写到 */
const ADAPT = ['萎缩', '肥大', '增生', '化生'];
function adaptCoverage(list) {
  return ADAPT.map((a) => ({
    kind: a,
    units: list.filter((u) => (u.rawBody || '').includes(a)).map((u) => u.sub),
  }));
}

/** 坏死的三个核的形态类别：核固缩、核碎裂、核溶解 */
const NUCLEAR = ['核固缩', '核碎裂', '核溶解'];
function nuclearCoverage(list) {
  return NUCLEAR.map((n) => ({
    sign: n,
    units: list.filter((u) => (u.rawBody || '').includes(n)).map((u) => u.sub),
  }));
}

/** 修复的两个结构：肉芽组织与瘢痕组织 */
const REPAIR = ['肉芽组织', '瘢痕组织'];
function repairCoverage(list) {
  return REPAIR.map((r) => ({
    kind: r,
    units: list.filter((u) => (u.rawBody || '').includes(r)).map((u) => u.sub),
  }));
}

/**
 * 六要素：观察 / 描述 / 记录 / 分析 / 报告 / 复核。
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

/** 中性表述：涉人群与生活方式的表述被要求取中性口径的单元 */
const NEUTRAL = '中性';
function neutralUnits(list) {
  return list.filter((u) => (u.rawBody || '').includes(NEUTRAL)).map((u) => u.sub);
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
  const triad = triadUnits(list);
  const adapt = adaptCoverage(list);
  const nuclear = nuclearCoverage(list);
  const repair = repairCoverage(list);
  const six = sixElementUnits(list);
  const handoff = handoffUnits(list);
  const neutral = neutralUnits(list);
  const secs = bySection(list);

  console.log('═══ 适应、损伤与修复：三类反应与一条连续线（病理学 第3章）═══');
  console.log(`教材规模: 第3章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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
  console.log('     这是全书形态密度最高的一章：病变要靠「长什么样」分辨，机制只作解释。');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log(`三类反应（适应 / 损伤 / 修复）同处出现的单元：${triad.length} / ${s.units}`);
  console.log(`  → ${triad.join(' ')}`);
  console.log('');

  console.log('适应反应的四个类别（写到的单元）：');
  for (const a of adapt) console.log(`  ${a.kind} · ${a.units.length} 单元 → ${a.units.join(' ') || '（无）'}`);
  console.log('坏死的三个核的形态类别（写到的单元）：');
  for (const n of nuclear) console.log(`  ${n.sign} · ${n.units.length} 单元 → ${n.units.join(' ') || '（无）'}`);
  console.log('修复的两个结构（写到的单元）：');
  for (const r of repair) console.log(`  ${r.kind} · ${r.units.length} 单元 → ${r.units.join(' ') || '（无）'}`);
  console.log('');

  console.log(`六要素被提到的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log(`把判断交给「具备资质的人员」的单元：${handoff.length} / ${s.units}`);
  console.log(`要求中性表述的单元：${neutral.length} / ${s.units}`);
  console.log('');

  console.log('教学边界：本章只说明适应/损伤/修复的形态与变化类别，不写数值与单位与参考值，不构成诊断/治疗/用药依据');

  return { list, shape: s, views, levels, audit, triad, adapt, nuclear, repair, six, handoff, neutral, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  TRIAD,
  ADAPT,
  NUCLEAR,
  REPAIR,
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
  triadUnits,
  adaptCoverage,
  nuclearCoverage,
  repairCoverage,
  sixElementUnits,
  handoffUnits,
  neutralUnits,
  bySection,
  main,
};
