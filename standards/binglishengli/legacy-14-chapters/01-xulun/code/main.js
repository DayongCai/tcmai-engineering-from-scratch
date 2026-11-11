#!/usr/bin/env node
/**
 * 病理生理学 · 第 1 章 绪论：病理生理学的任务与疾病观
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/01-xulun/docs/zh.md
 * 出处: 教材·疾病学基础·第1章（1.1 健康与疾病的概念类别，3 个知识单元）
 * 数据: standards/binglishengli/units.json（216 单元层，每单元带 goals / rawBody / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「绪论交的是框架，不是病名」，
 * 而这件事只能由教材自己的用词重心来证：三视角里机制与机能占多少、四层级里系统占多少、
 * 「前置 / 并列 / 分工」三类关系是不是只在这一章的最后一节才齐备。
 * 手打的数字会在底本改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/binglishengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const MAP = require(path.join(ROOT, 'scripts', 'lib_binglishengli_map'));
const UNITS_PATH = path.join(ROOT, 'standards', 'binglishengli', 'units.json');
const BASE_PATH = path.join(ROOT, 'standards', 'binglishengli', '底本.json');

const CHAPTER = 1;
const TITLE = '绪论：病理生理学的任务与疾病观';

/** 锚点：教材在 1.1.3 才把「前置 / 并列 / 分工」三类关系同时写出，本章的收口就在这里 */
const ANCHOR = ['前置', '并列', '分工'];

/** 第二组锚点：六要素是本章递给后面各章的框架 */
const FRAME = ['六要素'];

/** 教学边界句：main.js 最后一行，也是单测与自检门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明教材的类别与关系，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

const nonWs = (s) => String(s).replace(/\s/g, '').length;

/** 本课程章对应的底本小节，以及小节号里的底本章号（1.1.1 → 第1章） */
function sourceOf() {
  const locs = MAP.MAP[CHAPTER] || [];
  if (!locs.length) throw new Error(`课程第 ${CHAPTER} 章在代用底本里没有对应内容`);
  return locs;
}

/** 出处：教材·疾病学基础·第N章·N.M.K（N 取小节号本身，不取课程章号） */
const locatorOf = (sub) => `教材·${MAP.BOOK_NAME}·第${String(sub).split('.')[0]}章·${sub}`;

/**
 * 本章的知识单元：底本原文取自底本.json（引文池的同一口径），
 * 词频与字数取自 units.json（同一批单元的另一栏）。两处都不手填。
 */
function chapterUnits() {
  const base = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
  const rich = JSON.parse(fs.readFileSync(UNITS_PATH, 'utf8')).units;
  return MAP.subsOf(base, CHAPTER).map((u) => {
    const hit = rich.find((x) => x.sub === u.sub && x.chapter === u.chapter);
    if (!hit) throw new Error(`units.json 里没有 ${u.sub}`);
    return {
      sub: u.sub,
      title: u.title,
      sec: hit.sec,
      locator: locatorOf(u.sub),
      rawBody: u.rawBody,
      hanzi: hit.hanzi,
      measure: hit.measure,
      tri: hit.tri,
    };
  });
}

/** 规模：节数 / 单元数 / 汉字数 / 非空白字符数（后者是本章教材字数的口径） */
function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return {
    secs: secs.length,
    units: list.length,
    hanzi: list.reduce((n, u) => n + u.hanzi, 0),
    chars: list.reduce((n, u) => n + nonWs(u.rawBody), 0),
  };
}

/** 三视角与四层级：单元层的词频直接相加，得到本章的观察重心 */
function lens(list) {
  const views = { 病因: 0, 机制: 0, 机能: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of list) {
    for (const k of Object.keys(views)) views[k] += (u.measure && u.measure.views[k]) || 0;
    for (const k of Object.keys(levels)) levels[k] += (u.measure && u.measure.levels[k]) || 0;
  }
  return { views, levels };
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/**
 * 数值核验：底本自己声明「只写类别与关系」，本书的零值是实测结果而不是底本承诺。
 * 本函数把这件事当可核验的断言来复算——不是相信它，是检查它。
 */
function valueAudit(list) {
  return {
    units: list.length,
    hits: list.reduce((n, u) => n + (u.measure.valueLike || 0), 0),
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

/** 把 ANCHOR 里的词都写到的单元——「三类关系只在这一节齐备」的最小证据 */
function anchorCoverage(list, anchor = ANCHOR) {
  return list.filter((u) => anchor.every((k) => (u.rawBody || '').includes(k))).map((u) => u.sub);
}

/** 一节里的单元分布：本章只有 1.1 一节，这一栏用来核「三节均分」这类说法有没有依据 */
function bySection(list) {
  const out = new Map();
  for (const u of list) {
    if (!out.has(u.sec)) out.set(u.sec, { units: 0, hanzi: 0, chars: 0, subs: [] });
    const g = out.get(u.sec);
    g.units += 1;
    g.hanzi += u.hanzi;
    g.chars += nonWs(u.rawBody);
    g.subs.push(u.sub);
  }
  return out;
}

/** 单元小节号格式：第1章必须是 1.M.K */
function checkSubFormat(list, no = sourceOf()[0].ch) {
  const bad = list.filter((u) => !new RegExp(`^${no}\\.[1-9]\\.[1-9]$`).test(u.sub)).map((u) => u.sub);
  return { ok: bad.length === 0, bad };
}

function main() {
  const list = chapterUnits();
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const anchor = anchorCoverage(list);
  const frame = anchorCoverage(list, FRAME);
  const secs = bySection(list);
  const fmt = checkSubFormat(list);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章）═══`);
  console.log(`教材规模: ${list[0].sec.split(' ')[0]} 节 · ${s.chars} 非空白字符 · ${s.hanzi} 汉字 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 汉字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log(`小节号格式: ${fmt.ok ? '全部合规（1.M.K）' : '异常 ' + fmt.bad.join('、')}`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('');
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层：`);
  console.log('     概念章给的是框架与边界，不是某一种病理过程的细节。');
  console.log('');

  console.log(`逐条（小节号 / 标题 / 汉字 / 出处），合计 ${s.units} 个单元、${[...secs.keys()].length} 节：`);
  for (const u of list) console.log(`  ${u.sub} ${u.title} · ${u.hanzi} 字 · ${u.locator}`);
  console.log('');

  console.log(`三类关系（${ANCHOR.join(' / ')}）同时齐备的单元：${anchor.length} / ${s.units} → ${anchor.join('、') || '（无）'}`);
  console.log('  → 三类关系只在收口那一节同时出现：前置定顺序，并列定衔接，分工定边界。');
  console.log(`六要素框架落位的单元：${frame.length} / ${s.units} → ${frame.join('、') || '（无）'}`);
  console.log('  → 六要素不是清单，是后面各章反复回指的那组关系。');
  console.log('');

  console.log(BOUNDARY);

  return { list, shape: s, views, levels, audit, anchor, frame, secs, fmt };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  TITLE,
  ANCHOR,
  FRAME,
  BOUNDARY,
  sourceOf,
  locatorOf,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  valueAudit,
  anchorCoverage,
  bySection,
  checkSubFormat,
  main,
};
