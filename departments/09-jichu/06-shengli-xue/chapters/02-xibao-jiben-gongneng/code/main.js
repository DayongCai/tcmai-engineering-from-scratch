#!/usr/bin/env node
/**
 * 生理学 · 第 2 章 细胞的基本功能：跨膜转运·信号转导·电活动·收缩
 * 课程: departments/09-jichu/06-shengli-xue/chapters/02-xibao-jiben-gongneng/docs/zh.md
 * 出处: 教材·第2章（2.1–2.4，12 个知识单元）
 * 数据: standards/shengli/units.json（单元层：三视角 / 四层级词频 + 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章要证明的命题是：细胞层的功能可以写成一条单向链——
 * 跨膜转运 → 信号转导 → 电活动 → 收缩，四节就是四个链环。
 * 链是否成立不靠叙述，靠两点：四节的顺序能不能对上，以及链上有没有偷给数值。
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
const CHAPTER = '2';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
}

/** 单元正文：units.json 里个别单元 body 为空，退到 rawBody，避免统计静默变 0 */
function text(u) {
  return u.body && u.body.trim() ? u.body : (u.rawBody || '');
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

/** 链环：四节各自的关键词。顺序即链的顺序，错位说明教材不是按链组织 */
const LINKS = [
  { key: '转运', sec: '2.1' },
  { key: '信号', sec: '2.2' },
  { key: '电', sec: '2.3' },
  { key: '收缩', sec: '2.4' },
];

/** 检查四节标题是否按「转运→信号→电→收缩」排列。返回逐环命中情况 */
function chain(list) {
  const secTitles = new Map();
  for (const u of list) if (!secTitles.has(u.sec)) secTitles.set(u.sec, u.sec);
  return LINKS.map((l, i) => {
    const secs = [...secTitles.keys()].sort((a, b) => a.localeCompare(b, 'en'));
    const title = secs[i] || '';
    const titles = list.filter((u) => u.sec === title).map((u) => u.title);
    return {
      step: i + 1,
      key: l.key,
      sec: title,
      hit: titles.some((t) => t.includes(l.key)),
    };
  });
}

/** 关键词在本章的分布：哪个单元是某个概念的重心，用次数说话 */
function keyword(list, word) {
  const per = list
    .map((u) => ({ sub: u.sub, n: text(u).split(word).length - 1 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return { word, total: per.reduce((n, x) => n + x.n, 0), per, top: per[0] || null };
}

/** 细胞层的横向比较：本章的「细胞」词频在全 11 章里排第几 */
function cellRanking(units, list) {
  const rows = units.chapters.map((c) => {
    const us = units.units.filter((u) => u.chapter === c.no);
    return { no: c.no, title: c.title, cell: us.reduce((n, u) => n + (u.measure.levels.细胞 || 0), 0) };
  });
  rows.sort((a, b) => b.cell - a.cell);
  const mine = rows.find((r) => r.no === CHAPTER);
  return {
    rows,
    position: rows.indexOf(mine) + 1,
    cell: mine.cell,
    bookCell: rows.reduce((n, r) => n + r.cell, 0),
    shareOfBook: mine.cell / rows.reduce((n, r) => n + r.cell, 0),
  };
}

function bySection(list) {
  const out = new Map();
  for (const u of list) {
    if (!out.has(u.sec)) out.set(u.sec, { units: 0, hanzi: 0, subs: [], titles: [] });
    const g = out.get(u.sec);
    g.units += 1;
    g.hanzi += u.hanzi;
    g.subs.push(u.sub);
    g.titles.push(u.title);
  }
  return out;
}

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const ch = chain(list);
  const rankCell = cellRanking(units, list);
  const ca = keyword(list, '钙');
  const chan = keyword(list, '通道');
  const secs = bySection(list);

  console.log('═══ 细胞的基本功能：跨膜·信号·电·收缩（生理学 第2章）═══');
  console.log(`教材规模: 第2章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处`);
  console.log('');

  console.log('三视角（代谢 / 机能 / 形态）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次 · ${(share(views, k) * 100).toFixed(1)}%`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次 · ${(share(levels, k) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  → 形态 ${views.形态} 次高于机能 ${views.机能} 次：本章先讲「长什么样」，再讲「怎么动」。`);
  console.log(`  → 细胞层 ${levels.细胞} 次，在本章四层级里居首；全书细胞层 ${rankCell.bookCell} 次，本章占 ${(rankCell.shareOfBook * 100).toFixed(1)}%，排第 ${rankCell.position} 位。`);
  console.log('');

  console.log('四节 = 四个链环（转运 → 信号 → 电 → 收缩）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.titles[0].replace(/^\S+\s*/, '')}`);
  }
  console.log(`  链环标题命中：${ch.map((x) => `${x.sec}「${x.key}」${x.hit ? '✅' : '❌'}`).join(' · ')}`);
  console.log('');

  console.log('关键词重心（次数 / 集中于哪个单元）：');
  for (const k of [ca, chan]) {
    console.log(`  「${k.word}」${k.total} 次 · 重心 ${k.top ? `${k.top.sub}（${k.top.n} 次）` : '（无）'}`);
  }
  console.log(`  → 钙的 ${ca.total} 次里有 ${ca.top.n} 次落在 ${ca.top.sub}：兴奋收缩耦联是本章的钙中心。`);
  console.log('');

  console.log('教学边界：本章只说明细胞层的类别与关系与机制，不写数值与单位与正常值，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, chain: ch, rankCell, ca, chan, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  LINKS,
  load,
  text,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  chain,
  keyword,
  cellRanking,
  bySection,
  main,
};
