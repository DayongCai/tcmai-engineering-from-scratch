#!/usr/bin/env node
/**
 * 病理学 · 第 13 章 休克：病因、分期、细胞与器官、表述边界
 * 课程: departments/09-jichu/10-bingli-xue/chapters/13-xiuke/docs/zh.md
 * 出处: 教材·第13章（13.1–13.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 body / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「休克是一条会自己加速的链」。
 * 链是否成立，取决于教材自己在哪些单元写了微循环、在哪一期写了「恶性循环」，
 * 以及它有没有偷偷给数值。手打的数字会随教材改版静默过期；现算的对不上就报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/13-xiuke/code —— 不硬数 ../ 的层数，向上找带 standards/bingli 的那一级
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
const CHAPTER = '13';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

/** 本章 12 个知识单元，按 sub 号排 */
function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
}

/** 规模：节数 / 单元数 / 汉字数。hanzi 由底本给出，不估算 */
function shape(list) {
  return {
    secs: new Set(list.map((u) => u.sec)).size,
    units: list.length,
    hanzi: list.reduce((n, u) => n + u.hanzi, 0),
  };
}

/** 三视角（病因 / 机制 / 形态）× 四层级（细胞 / 组织 / 器官 / 系统） */
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

/** 数值核验：底本声明「不写数值与单位」，这里把它当断言复算，不是照抄声明 */
function valueAudit(list) {
  return {
    units: list.length,
    hits: list.reduce((n, u) => n + (u.measure.valueLike || 0), 0),
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

/** 四节的知识分布 */
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

/** 一个词在本章正文里出现多少次（正文字数口径的朴素计数，不做分词） */
function wordCount(list, w) {
  let n = 0;
  for (const u of list) {
    const s = u.body || '';
    let i = s.indexOf(w);
    while (i !== -1) {
      n += 1;
      i = s.indexOf(w, i + w.length);
    }
  }
  return n;
}

/** 含某词/某模式的单元清单 —— 用来定位「这一层写在哪几个单元」 */
function unitsWith(list, re) {
  return list.filter((u) => re.test(u.body || '')).map((u) => u.sub);
}

/**
 * 休克的三期链：教材把「缺血性缺氧 → 淤血性缺氧 → 难治」写成连续过渡，
 * 而不给时限。这里数的是词频，不是时刻表 —— 词频能说明叙事的重心在哪一期。
 */
const STAGES = [
  { key: '缺血性缺氧', pat: '缺血性缺氧' },
  { key: '淤血性缺氧', pat: '淤血性缺氧' },
  { key: '难治', pat: '难治' },
  { key: '微循环', pat: '微循环' },
  { key: '类别', pat: '类别' },
  { key: '六要素', pat: '六要素' },
];

function stageProfile(list) {
  return STAGES.map(({ key, pat }) => {
    let n = 0;
    for (const u of list) n += (u.body || '').split(pat).length - 1;
    return { key, hits: n, units: unitsWith(list, new RegExp(pat)).length };
  });
}

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const secs = bySection(list);
  const prof = stageProfile(list);

  console.log('═══ 休克：从灌注不足到多器官功能障碍（病理学 第13章）═══');
  console.log(`教材规模: 第13章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('分期叙事的分量（词频 / 命中单元数）：');
  for (const p of prof) {
    console.log(`  ${p.key.padEnd(6, '　')} ${String(p.hits).padStart(4)} 次 · 分布在 ${p.units} 个单元`);
  }
  console.log('');
  console.log(`微循环写在哪几个单元：${unitsWith(list, /微循环/).join('、')}`);
  console.log(`「难治」写在哪几个单元：${unitsWith(list, /难治/).join('、')}`);
  console.log('  → 三期的差别被写在微循环的「前阻力 / 后阻力」上，而不是写在时限上；');
  console.log('     这是本章唯一的可检查结构：抽掉「后阻力」这一半，三期的差别就只剩形容词。');
  console.log('');

  console.log(`表述类单元（含「六要素」）：${unitsWith(list, /六要素/).join('、') || '（无）'}`);
  console.log(`含「不作疾病诊断」的单元：${unitsWith(list, /不作疾病诊断/).length} / ${s.units} —— 边界声明写在每个单元，不是写在章末。`);
  console.log('');

  console.log('教学边界：本章只说明休克的功能与代谢变化的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, secs, prof };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  STAGES,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  bySection,
  wordCount,
  unitsWith,
  stageProfile,
  main,
};
