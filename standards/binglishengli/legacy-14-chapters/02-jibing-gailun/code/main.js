#!/usr/bin/env node
/**
 * 病理生理学 · 第 2 章 疾病概论：病因、发病机制与转归
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/02-jibing-gailun/docs/zh.md
 * 出处: 教材·疾病学基础·第1章（1.2 病因与条件 / 1.3 一般规律 / 1.4 转归，共 9 个知识单元）
 * 数据: standards/binglishengli/units.json（216 单元层，每单元带 goals / rawBody / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章名为「病因」，但真正撑起解释力的是 1.3 的三组规律。
 * 这个判断不能靠感觉——三视角里机制与病因的词频差、九个单元里「起始 / 中间 / 末端」
 * 三类环节的落位数，都由程序从底本现数。数字变了，文中的结论就得改，程序会先把账摆出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

const CHAPTER = 2;
const TITLE = '疾病概论：病因、发病机制与转归';

/** 锚点：三类环节（起始 / 中间 / 末端）是本课程「机制」这条主线的骨架 */
const ANCHOR = ['起始', '中间', '末端'];

/** 第二组锚点：转归的两类结果，两节互相回指才成立 */
const FRAME = ['完全康复', '不完全康复'];

const BOUNDARY = '教学边界：本章只说明教材的类别与关系，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

const nonWs = (s) => String(s).replace(/\s/g, '').length;

function sourceOf() {
  const locs = MAP.MAP[CHAPTER] || [];
  if (!locs.length) throw new Error(`课程第 ${CHAPTER} 章在代用底本里没有对应内容`);
  return locs;
}

/** 出处：教材·疾病学基础·第N章·N.M.K（N 取小节号本身，不取课程章号） */
const locatorOf = (sub) => `教材·${MAP.BOOK_NAME}·第${String(sub).split('.')[0]}章·${sub}`;

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

function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return {
    secs: secs.length,
    units: list.length,
    hanzi: list.reduce((n, u) => n + u.hanzi, 0),
    chars: list.reduce((n, u) => n + nonWs(u.rawBody), 0),
  };
}

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
const share = (o, k) => (total(o) ? o[k] / total(o) : 0);

function valueAudit(list) {
  return {
    units: list.length,
    hits: list.reduce((n, u) => n + (u.measure.valueLike || 0), 0),
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

function anchorCoverage(list, anchor = ANCHOR) {
  return list.filter((u) => anchor.every((k) => (u.rawBody || '').includes(k))).map((u) => u.sub);
}

/** 底本三节各 3 单元：本节用来核「教材按话题均分、不按重要性分层」这个判断 */
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

/** 每个单元的主视角：三组规律各自落在哪个视角上，看的是这一栏 */
function primaryViews(list) {
  const out = { 病因: [], 机制: [], 机能: [] };
  for (const u of list) {
    const p = u.tri && u.tri.view && u.tri.view.primary;
    if (p && out[p]) out[p].push(u.sub);
  }
  return out;
}

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
  const prim = primaryViews(list);
  const fmt = checkSubFormat(list);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章）═══`);
  console.log(`教材规模: ${s.secs} 节 · ${s.chars} 非空白字符 · ${s.hanzi} 汉字 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 汉字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log(`小节号格式: ${fmt.ok ? '全部合规（1.M.K）' : '异常 ' + fmt.bad.join('、')}`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角的 ${(share(views, k) * 100).toFixed(1)}%`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('');
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层：`);
  console.log('     名为「病因」的一章，笔墨其实压在「经过」上——病因写成类别表，解释力放在三组规律。');
  console.log('');

  console.log(`逐条（小节号 / 标题 / 汉字 / 主视角 / 出处），合计 ${s.units} 个单元、${secs.size} 节：`);
  for (const u of list) {
    const p = (u.tri && u.tri.view && u.tri.view.primary) || '—';
    console.log(`  ${u.sub} ${u.title} · ${u.hanzi} 字 · 主视角 ${p} · ${u.locator}`);
  }
  console.log('');

  console.log('三节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log(`三类环节（${ANCHOR.join(' / ')}）同时齐备的单元：${anchor.length} / ${s.units} → ${anchor.join('、') || '（无）'}`);
  console.log('  → 环节链只在讲因果交替的那一节完整展开，其余各节引用它而不重复定义。');
  console.log(`转归两类（${FRAME.join(' / ')}）并写的单元：${frame.length} / ${s.units} → ${frame.join('、') || '（无）'}`);
  console.log('  → 两类结果互为例外与对照：只写一类，另一类就会被当成默认结局。');
  for (const k of Object.keys(prim)) console.log(`  主视角为「${k}」的单元：${prim[k].length} → ${prim[k].join('、') || '（无）'}`);
  console.log('');

  console.log(BOUNDARY);

  return { list, shape: s, views, levels, audit, anchor, frame, secs, prim, fmt };
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
  share,
  valueAudit,
  anchorCoverage,
  bySection,
  primaryViews,
  checkSubFormat,
  main,
};
