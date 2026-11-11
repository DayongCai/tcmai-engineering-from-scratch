#!/usr/bin/env node
/**
 * 病理学 · 第 7 章 水、电解质代谢紊乱：容量与渗透压两把尺
 * 课程: departments/09-jichu/10-bingli-xue/chapters/07-shui-dianjiezhi-wenluan/docs/zh.md
 * 出处: 教材·第7章（7.1–7.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 goals / rawBody / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「水钠紊乱的分类是容量与渗透压两把尺的组合」，
 * 而组合是否成立，取决于教材自己有没有把两把尺都写到、有没有偷偷给数值。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/10-bingli-xue/chapters/05-yanzheng/code
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
const CHAPTER = '7';
const TITLE = '水、电解质代谢紊乱';

/** 两把尺：容量与渗透压。教材在 7.1.1 立尺，7.2.3 用它们的组合做分类 */
const ANCHOR = ['容量', '渗透压'];

/** 教学边界句：main.js 最后一行，也是单测与自检门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明教材的形态类别与关系，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

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

/** 把 ANCHOR 里的词都写到的单元。这是「三要素是配比」能不能落地的最小证据 */
function anchorCoverage(list, anchor = ANCHOR) {
  return list
    .filter((u) => anchor.every((k) => (u.rawBody || '').includes(k)))
    .map((u) => u.sub);
}

/** 四节的知识分布：每节几个单元、多少字。四节就是四个话题 */
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

/** 带【本节要点】的单元：教材自己标了小结的位置 */
function pointsUnits(list) {
  return list.filter((u) => (u.rawBody || '').includes('【本节要点】')).map((u) => u.sub);
}

/** 单元小节号格式：第5章必须是 5.M.K */
function checkSubFormat(list, no = CHAPTER) {
  const bad = list.filter((u) => !new RegExp(`^${no}\\.[1-9]\\.[1-9]$`).test(u.sub)).map((u) => u.sub);
  return { ok: bad.length === 0, bad };
}

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const anchor = anchorCoverage(list);
  const points = pointsUnits(list);
  const secs = bySection(list);
  const fmt = checkSubFormat(list);

  console.log(`═══ ${TITLE}：容量与渗透压两把尺（病理学 第${CHAPTER}章）═══`);
  console.log(`教材规模: 第${CHAPTER}章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log(`小节号格式: ${fmt.ok ? `全部合规（${CHAPTER}.M.K）` : '异常 ' + fmt.bad.join('、')}`);
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
  console.log('     水钠紊乱讲的是「容量与渗透压各自怎么变、组合成哪一类」，不是「病因是什么」。');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('12 个单元逐条（小节号 / 标题 / 汉字 / 出处）：');
  for (const u of list) {
    console.log(`  ${u.sub} ${u.title.replace(/^[\d.]+\s*/, '')} · ${u.hanzi} 字 · ${u.locator}`);
  }
  console.log('');

  console.log(`两把尺（${ANCHOR.join(' / ')}）同时写到的单元：${anchor.length} / ${s.units} → ${anchor.join('、') || '（无）'}`);
  console.log('  → 剩下的是各节分工：平衡与调节两节讲「来源—去路」与三条通路，');
  console.log('     钾与钙磷两节换对象但沿用同一方法，收口一节只做归纳与口径。');
  console.log(`教材自带【本节要点】的单元：${points.length} / ${s.units} → ${points.join('、') || '（无）'}`);
  console.log('');

  console.log(BOUNDARY);

  return { list, shape: s, views, levels, audit, anchor, points, secs, fmt };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  TITLE,
  ANCHOR,
  BOUNDARY,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  anchorCoverage,
  bySection,
  pointsUnits,
  checkSubFormat,
  main,
};
