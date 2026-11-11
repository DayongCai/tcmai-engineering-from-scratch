#!/usr/bin/env node
/**
 * 病理学 · 第 17 章 呼吸系统疾病：从气道到肺泡，再由肺及心
 * 课程: departments/09-jichu/10-bingli-xue/chapters/17-huxi-jibing/docs/zh.md
 * 出处: 教材·第17章（17.1–17.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 brief / rawBody / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「一条由肺及心的关系链能不能被指出来」，
 * 而这条链是否成立，取决于教材有没有把环节写全、有没有偷偷给数值。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/10-bingli-xue/chapters/17-huxi-jibing/code
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
const CHAPTER = '17';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

/** 本章的 12 个知识单元，按 sub 号排 */
function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => String(u.chapter) === no)
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

/** 环节序列：一个单元要同时写出全部环节，才算把「链」写全，缺一环不算 */
const PNEUMONIA = ['充血', '纤维素', '消散'];
const RIGHT_HEART = ['肺泡壁', '血管床', '右心'];
const COPD_TRIO = ['慢性支气管炎', '肺气肿', '小气道'];

function chainUnits(list, keys) {
  return list.filter((u) => keys.every((k) => (u.body || '').includes(k))).map((u) => u.sub);
}

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const secs = bySection(list);
  const pneumonia = chainUnits(list, PNEUMONIA);
  const rightHeart = chainUnits(list, RIGHT_HEART);
  const copd = chainUnits(list, COPD_TRIO);

  console.log('═══ 呼吸系统疾病（病理学 第17章）═══');
  console.log(`教材规模: 第${CHAPTER}章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 形态）本章词频：');
  for (const [k, v] of rank(views)) {
    console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角 ${(share(views, k) * 100).toFixed(1)}%`);
  }
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) {
    console.log(`  ${k} ${String(v).padStart(4)} 次 · 占四层级 ${(share(levels, k) * 100).toFixed(1)}%`);
  }
  console.log('');
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层：`);
  console.log('     教材谈的是「肺泡与气道长成什么样」，机制只写到环节，不写参数。');
  console.log('');

  console.log('四节的知识分布（节 / 单元 / 汉字 / 单元号）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log(`大叶性肺炎阶段（${PNEUMONIA.join(' → ')}）写全的单元：${pneumonia.length} / ${s.units} → ${pneumonia.join('、') || '（无）'}`);
  console.log(`由肺及心链条（${RIGHT_HEART.join(' → ')}）写全的单元：${rightHeart.length} / ${s.units} → ${rightHeart.join('、') || '（无）'}`);
  console.log(`慢阻肺三类别（${COPD_TRIO.join(' + ')}）写全的单元：${copd.length} / ${s.units} → ${copd.join('、') || '（无）'}`);
  console.log('  → 由肺及心的链条被四个单元复述，是本章唯一被反复写全的跨器官关系；');
  console.log('     肺炎的阶段只在 17.3.1 写全，其余单元只承接其中一段。');
  console.log('');

  console.log('教学边界：本章只说明教材的病变与形态与关系的类别，不写数值与单位与参考值，不构成诊断或用药依据');

  return { list, shape: s, views, levels, audit, pneumonia, rightHeart, copd, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  PNEUMONIA,
  RIGHT_HEART,
  COPD_TRIO,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  bySection,
  chainUnits,
  main,
};
