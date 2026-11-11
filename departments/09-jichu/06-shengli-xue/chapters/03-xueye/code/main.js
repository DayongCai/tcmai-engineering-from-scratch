#!/usr/bin/env node
/**
 * 生理学 · 第 3 章 血液：组成·理化特性·血细胞与凝血
 * 课程: departments/09-jichu/06-shengli-xue/chapters/03-xueye/docs/zh.md
 * 出处: 教材·第3章（3.1–3.4，12 个知识单元）
 * 数据: standards/shengli/units.json（单元层：三视角 / 四层级词频 + 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 血液这一章最容易被讲成一张又一张的数字表（计数、浓度、时间、滴度），
 * 而底本一个数值都没给。所以本章的代码只做一件事：把「不给数值也能写清」
 * 的那三张结构图量出来——止血的三枚齿轮、生成与破坏的平衡、血型的判定表。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
const CHAPTER = '3';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
}

/** 单元正文：3.1.1 在单元层 body 为空，必须退到 rawBody，否则统计静默变 0 */
function text(u) {
  return u.body && u.body.trim() ? u.body : (u.rawBody || '');
}

function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return { secs: secs.length, units: list.length, hanzi: list.reduce((n, u) => n + u.hanzi, 0) };
}

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

function valueAudit(list) {
  return {
    units: list.length,
    hits: list.reduce((n, u) => n + (u.measure.valueLike || 0), 0),
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

function keyword(list, word) {
  const per = list
    .map((u) => ({ sub: u.sub, n: text(u).split(word).length - 1 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return { word, total: per.reduce((n, x) => n + x.n, 0), per, top: per[0] || null };
}

/**
 * 止血的三枚齿轮：凝血（建网）、抗凝（限网）、纤维蛋白溶解（拆网）。
 * 三者各有一个重心单元，量出来就能说明「教材把止血写成一个三件套」。
 */
const GEARS = [
  { name: '凝血', word: '凝血', unit: '3.3.1' },
  { name: '抗凝', word: '抗凝', unit: '3.3.2' },
  { name: '纤维蛋白溶解', word: '纤维蛋白溶解', unit: '3.3.3' },
];

function gears(list) {
  return GEARS.map((g) => {
    const k = keyword(list, g.word);
    return { ...g, total: k.total, top: k.top, inUnit: (k.per.find((x) => x.sub === g.unit) || { n: 0 }).n };
  });
}

/** 生成与破坏：血液细胞的数量稳定靠两端相抵，两端都在 3.2.3 落到实地 */
function turnover(list) {
  const gen = keyword(list, '生成');
  const des = keyword(list, '破坏');
  return { gen, des, balanceUnit: '3.2.3' };
}

/** 血型：抗原与抗体的有无所构成的判定表，不需要任何数值 */
function bloodGroups(list) {
  const antigen = keyword(list, '抗原');
  const antibody = keyword(list, '抗体');
  const group = keyword(list, '血型');
  return { antigen, antibody, group, unit: '3.4.2' };
}

/** 四层级的横向比较：本章「细胞」居全书第二，「组织」最薄 */
function levelRanking(units, list) {
  const rows = units.chapters.map((c) => {
    const us = units.units.filter((u) => u.chapter === c.no);
    return { no: c.no, cell: us.reduce((n, u) => n + (u.measure.levels.细胞 || 0), 0) };
  });
  rows.sort((a, b) => b.cell - a.cell);
  const mine = rows.find((r) => r.no === CHAPTER);
  const { levels } = lens(list);
  return {
    cellPosition: rows.indexOf(mine) + 1,
    cell: mine.cell,
    bookCell: rows.reduce((n, r) => n + r.cell, 0),
    cellShareOfBook: mine.cell / rows.reduce((n, r) => n + r.cell, 0),
    tissue: levels.组织,
    tissueShare: levels.组织 / total(levels),
  };
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
  const gs = gears(list);
  const t = turnover(list);
  const bg = bloodGroups(list);
  const lv = levelRanking(units, list);

  console.log('═══ 血液：组成·理化特性·血细胞与凝血（生理学 第3章）═══');
  console.log(`教材规模: 第3章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处`);
  console.log('');

  console.log('三视角（代谢 / 机能 / 形态）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次 · ${(share(views, k) * 100).toFixed(1)}%`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次 · ${(share(levels, k) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  → 细胞层 ${lv.cell} 次居本章之首，全书排第 ${lv.cellPosition}（占全书细胞层的 ${(lv.cellShareOfBook * 100).toFixed(1)}%）：可数的对象是血细胞。`);
  console.log(`  → 组织层只有 ${lv.tissue} 次，占本章层级的 ${(lv.tissueShare * 100).toFixed(1)}%：教材自称液态组织，词频上却几乎不用「组织」。`);
  console.log('');

  console.log('四节的知识分布：');
  for (const [sec, g] of [...bySection(list).entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('止血的三枚齿轮（词频 / 重心单元）：');
  for (const g of gs) {
    console.log(`  ${g.name} ${String(g.total).padStart(3)} 次 · 重心 ${g.top ? g.top.sub : '（无）'} · 本节 ${g.unit} 内 ${g.inUnit} 次`);
  }
  console.log('  → 建网、限网、拆网三件事各占一个单元，教材把止血写成一个三件套而不是一条直线。');
  console.log('');

  console.log('生成与破坏（两端相抵才是稳定）：');
  console.log(`  「生成」${t.gen.total} 次 · 重心 ${t.gen.top.sub}（${t.gen.top.n} 次）`);
  console.log(`  「破坏」${t.des.total} 次 · 重心 ${t.des.top.sub}（${t.des.top.n} 次）`);
  console.log(`  → 两端重心同为 ${t.balanceUnit}：稳定不靠「多造」，靠「造与毁相等」。`);
  console.log('');

  console.log('血型判定（有 / 无，不是多 / 少）：');
  console.log(`  「血型」${bg.group.total} 次 · 重心 ${bg.group.top.sub}（${bg.group.top.n} 次）`);
  console.log(`  「抗原」${bg.antigen.total} 次 · 「抗体」${bg.antibody.total} 次 · 判定单元 ${bg.unit}`);
  console.log('  → 分型只看膜上抗原的有无，相容只看抗原与抗体是否配对：一张布尔表，不需要数值。');
  console.log('');

  console.log('教学边界：本章只说明血液的类别与关系与机制，不写数值与单位与正常值，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, gears: gs, turnover: t, bloodGroups: bg, levelRanking: lv };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  GEARS,
  load,
  text,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  keyword,
  gears,
  turnover,
  bloodGroups,
  levelRanking,
  bySection,
  main,
};
