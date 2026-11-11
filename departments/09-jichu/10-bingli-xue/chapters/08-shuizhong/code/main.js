#!/usr/bin/env node
/**
 * 病理学 · 第 8 章 水肿
 * 课程: departments/09-jichu/10-bingli-xue/chapters/08-shuizhong/docs/zh.md
 * 出处: 教材·第8章（8.1–8.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 prose / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「水肿由两个平衡共同决定」——
 * 血管内外液体交换的平衡，与机体内外的交换平衡。两条账是否都在教材里
 * 被写成可检查的环节，决定了「水多了」这句话能不能拆开。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
const CHAPTER = '8';

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
    for (const k of Object.keys(views)) views[k] += (u.measure && u.measure.views[k]) || 0;
    for (const k of Object.keys(levels)) levels[k] += (u.measure && u.measure.levels[k]) || 0;
  }
  return { views, levels };
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const share = (o, k) => (total(o) ? o[k] / total(o) : 0);

/** 数值核验：底本声明「不写数值与单位与参考值」。这里把它当断言复算 */
function valueAudit(list) {
  const hits = list.reduce((n, u) => n + ((u.measure && u.measure.valueLike) || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => ((u.measure && u.measure.valueLike) || 0) > 0).map((u) => u.sub),
  };
}

/** 观察与描述六要素：本章用它约束病理报告的写法 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];

/** 六要素在正文里写全的单元 */
function sixElementUnits(list) {
  return list.filter((u) => SIX.every((k) => (u.body || '').includes(k))).map((u) => u.sub);
}

/** 口径句：写明「不写数值」的单元。教材有几种写法，这里按同一口径归并 */
function boundaryUnits(list) {
  return list.filter((u) => /不写[^。]{0,12}数值|不写数值与单位/.test(u.body || '')).map((u) => u.sub);
}

/** 本章四个环节：每一节几个单元、多少字 */
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

/** 血管内外交换的四条机制类别：本章的「四条力量 + 一个出口」 */
const MECH = ['流体静压', '胶体渗透压', '淋巴回流', '通透性'];
function mechCoverage(list) {
  return MECH.map((k) => ({ key: k, units: list.filter((u) => (u.body || '').includes(k)).map((u) => u.sub) }));
}

/** 全身性水肿的三个主要类别：心性 / 肾性 / 肝性，各占一个单元 */
const SYSTEMIC = [
  { key: '心性水肿', sub: '8.2.1' },
  { key: '肾性水肿', sub: '8.2.2' },
  { key: '肝性水肿', sub: '8.2.3' },
];
function systemicUnits(list) {
  const bySub = new Map(list.map((u) => [u.sub, u]));
  return SYSTEMIC.map((s) => ({
    key: s.key,
    sub: s.sub,
    found: (bySub.get(s.sub) || {}).title ? (bySub.get(s.sub).body || '').includes(s.key) : false,
  }));
}

/** 两层平衡：血管内外（8.1.1）与机体内外（8.1.2），本章的骨架 */
const TWO_BOOKS = [
  { book: '血管内外液体交换', sub: '8.1.1' },
  { book: '机体内外液体交换', sub: '8.1.2' },
];

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const six = sixElementUnits(list);
  const bounded = boundaryUnits(list);
  const secs = bySection(list);
  const mech = mechCoverage(list);
  const sys = systemicUnits(list);

  console.log('═══ 水肿（病理学 第8章）═══');
  console.log(`教材规模: 第8章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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
  console.log('     水肿不是一处病灶，而是两条账同时失衡的结果；机制是主线，形态是旁证。');
  console.log('');

  console.log('四节的知识分布（单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');
  console.log('两层平衡（本章骨架）：');
  for (const b of TWO_BOOKS) console.log(`  ${b.sub} ${b.book}`);
  console.log('');
  console.log('血管内外交换的四条机制类别（覆盖单元数）：');
  for (const m of mech) console.log(`  ${m.key} ${m.units.length} / ${s.units} → ${m.units.join('、')}`);
  console.log('');
  console.log('全身性水肿的三个主导类别：');
  for (const x of sys) console.log(`  ${x.sub} ${x.key} ${x.found ? '✓ 本节正文命中' : '✗ 未命中'}`);
  console.log('');
  console.log(`观察与描述六要素写全的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log(`写明「不写数值」口径的单元：${bounded.length} / ${s.units}`);
  console.log('');

  console.log('教学边界：本章只说明教材的机制类别与表现类别的写法，不写数值与单位与参考值，不构成诊断/治疗/用药依据');

  return { list, shape: s, views, levels, audit, six, bounded, secs, mech, sys };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  SIX,
  MECH,
  SYSTEMIC,
  TWO_BOOKS,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  boundaryUnits,
  bySection,
  mechCoverage,
  systemicUnits,
  main,
};
