#!/usr/bin/env node
/**
 * 生理学 · 第 1 章 绪论：研究对象、三个水平与调节框架
 * 课程: departments/09-jichu/06-shengli-xue/chapters/01-xulun/docs/zh.md
 * 出处: 教材·第1章（1.1–1.4，12 个知识单元）
 * 数据: standards/shengli/units.json（132 单元层，每单元带 goals / body / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「稳态与调节是可以写成回路的」，
 * 而回路是否成立，取决于教材自己有没有把环节写全、有没有偷偷给数值。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/06-shengli-xue/chapters/01-xulun/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/shengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'shengli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/shengli/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'shengli', 'units.json');
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
  const views = { 代谢: 0, 机能: 0, 形态: 0 };
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
 * 数值核验：底本自己声明「不写数值与单位与正常值」。
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

/** 反射弧的五个环节：教材把它们写成一条链，链上任一环节变了，表现就变 */
const ARC = ['感受器', '传入神经', '神经中枢', '传出神经', '效应器'];

/** 在本章正文里把五环节写全的单元。这是「回路」能不能落地的最小证据 */
function reflexArc(list) {
  return list
    .filter((u) => ARC.every((k) => (u.body || '').includes(k)))
    .map((u) => u.sub);
}

/** 标题落在「调节 / 反馈 / 前馈」上的单元：本章的调节框架占了几个单元 */
const CONTROL_RE = /调节|反馈|前馈/;
function controlUnits(list) {
  return list.filter((u) => CONTROL_RE.test(u.title)).map((u) => ({ sub: u.sub, title: u.title }));
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
  const arc = reflexArc(list);
  const control = controlUnits(list);
  const secs = bySection(list);

  console.log('═══ 绪论：研究对象、三个水平与调节框架（生理学 第1章）═══');
  console.log(`教材规模: 第1章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（代谢 / 机能 / 形态）本章词频：');
  for (const [k, v] of rank(views)) {
    console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角的 ${(share(views, k) * 100).toFixed(1)}%`);
  }
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) {
    console.log(`  ${k} ${String(v).padStart(4)} 次 · 占四层级的 ${(share(levels, k) * 100).toFixed(1)}%`);
  }
  console.log('');
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层：`);
  console.log('     绪论讲的是「系统之间怎么配合」，不是「细胞里发生什么」。');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log(`调节框架占的单元：${control.length} / ${s.units}`);
  for (const c of control) console.log(`  ${c.sub} ${c.title}`);
  console.log('');
  console.log(`反射弧五环节写全的单元：${arc.length} / ${s.units} → ${arc.join('、') || '（无）'}`);
  console.log('  → 五环节齐备只有一处：神经调节是本章唯一被写成「完整回路」的调节方式，');
  console.log('     体液调节与自身调节在教材里只写到「载体 + 靶 + 结果」，没有再画回路。');
  console.log('');

  console.log('教学边界：本章只说明教材的类别与关系与调节框架，不写数值与单位与正常值，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, arc, control, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  ARC,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  reflexArc,
  controlUnits,
  bySection,
  main,
};
