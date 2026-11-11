#!/usr/bin/env node
/**
 * 病理生理学 · 第 7 章 应激：类别、两层的环节、由调到变、边界
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/07-yingji/docs/zh.md
 * 出处: 教材·疾病学基础·第7章（7.3.1–7.4.3，6 个知识单元）
 * 数据: standards/binglishengli/底本.json（章 → 节 → 小节）+ standards/binglishengli/units.json（词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「应激不是一份反应清单，而是同一目标在两层上的投影，
 * 由功能调整到功能紊乱之间只隔着一条『能否自行回转』」。这条命题是否成立，取决于教材
 * 有没有真的把两类环节、六类细胞动作、三层关系写出来，也取决于它有没有偷偷给出时限与量值。
 * 手打的数字会在底本改版后静默过期；这里一律读盘现算。
 *
 * 一处必须记住的口径：本章的「章」指课程第 7 章，其底本位置是**底本第 7 章的 7.3、7.4 两节**。
 * 底本 7.1、7.2 属课程第 9 章（休克），本章不取——章号取小节号本身，所以引文一律写「第7章·7.3.1」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', '底本.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const BASE = path.join(ROOT, 'standards', 'binglishengli', '底本.json');
const UNITS = path.join(ROOT, 'standards', 'binglishengli', 'units.json');
const M = require(path.join(ROOT, 'scripts', 'lib_binglishengli_map.js'));

/** 课程章号（本课 7 = 应激） */
const CHAPTER = 7;

const loadBase = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const loadUnits = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

const nonWs = (s) => String(s || '').replace(/\s/g, '');
const secOf = (sub) => String(sub).split('.').slice(0, 2).join('.');

/** 本章的 6 个单元：一律走映射层，不在本文件里另抄一份小节号 */
function chapterUnits(base) {
  return M.subsOf(base, CHAPTER).map((u) => ({
    sub: u.sub,
    sec: secOf(u.sub),
    title: u.title,
    raw: u.rawBody,
    chars: nonWs(u.rawBody).length,
  }));
}

function shape(list) {
  return {
    secs: new Set(list.map((u) => u.sec)).size,
    units: list.length,
    chars: list.reduce((n, u) => n + u.chars, 0),
  };
}

/** 单元层的词频与数值核验（units.json 由 build_binglishengli_text.py 现算） */
function unitMeta(units) {
  const bySub = new Map(units.units.map((u) => [u.sub, u]));
  return (list) => list.map((u) => bySub.get(u.sub)).filter(Boolean);
}

function lens(meta) {
  const views = { 病因: 0, 机制: 0, 机能: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of meta) {
    const m = u.measure || {};
    for (const k of Object.keys(views)) views[k] += (m.views && m.views[k]) || 0;
    for (const k of Object.keys(levels)) levels[k] += (m.levels && m.levels[k]) || 0;
  }
  return { views, levels };
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const share = (o, k) => (total(o) ? o[k] / total(o) : 0);

/** 数值核验：底本声明「只写类别与关系与要求」，本函数把它当作可核验的断言复算 */
function valueAudit(meta) {
  const hits = meta.reduce((n, u) => n + ((u.measure && u.measure.valueLike) || 0), 0);
  return {
    units: meta.length,
    hits,
    offenders: meta.filter((u) => ((u.measure && u.measure.valueLike) || 0) > 0).map((u) => u.sub),
  };
}

/**
 * 本章的两面：神经内分泌（全身动员）与细胞（自保）。
 * 每个探针词只回答「这一节有没有写这个环节」，不回答「写了多少次」——次数对教学没有增量。
 */
const FACES = [
  { face: '神经内分泌', probe: '以神经通路为主', label: '快速调节：交感广泛激活' },
  { face: '神经内分泌', probe: '肾上腺髓质', label: '髓质环节：略延后而延续' },
  { face: '神经内分泌', probe: '以体液通路为主', label: '持续调节：下丘脑—垂体—皮质' },
  { face: '神经内分泌', probe: '糖皮质激素', label: '代谢底物 / 免疫强度 / 血管应答' },
  { face: '细胞', probe: '应激蛋白', label: '协助折叠、减少异常聚集' },
  { face: '细胞', probe: '折叠', label: '修复或清除错误折叠' },
  { face: '细胞', probe: '抗氧化', label: '氧化与抗氧化的平衡' },
  { face: '细胞', probe: '自噬', label: '回收受损结构与成分' },
  { face: '细胞', probe: '内质网', label: '加工负担过重时的调整' },
  { face: '细胞', probe: '修复机制', label: '可修复损伤的修复' },
];

function faceCoverage(list) {
  return FACES.map((f) => ({ ...f, units: list.filter((u) => u.raw.includes(f.probe)).map((u) => u.sub) }));
}

/** 层次：功能调整 → 结构痕迹；功能紊乱 = 难以自行回转。只统计落点，不作程度判断 */
const LAYERS = [
  { key: '功能层面的调整', note: '可调节的偏离，随应激缓解而回稳' },
  { key: '结构层面留下痕迹', note: '由调到变的「变」那一侧' },
  { key: '难以自行回转', note: '功能紊乱的唯一界线（不是严重程度）' },
  { key: '双向关系', note: '功能偏离反过来加重应激负担' },
];

function layerCoverage(list) {
  return LAYERS.map((l) => ({ ...l, units: list.filter((u) => u.raw.includes(l.key)).map((u) => u.sub) }));
}

/** 个体差异的三类来源 + 一条反向提醒：教材自己写死了「不排次序」 */
const DIFF = [
  { key: '调节储备', note: '储备足则偏离出现较晚；只说明倾向' },
  { key: '基础状态与伴随情况', note: '既往功能偏离、年龄阶段、生活条件（只作类别）' },
  { key: '刺激本身的类别特征', note: '性质、强度、持续时间；与个体状态相互作用' },
];

function diffCoverage(list) {
  return DIFF.map((d) => ({ ...d, units: list.filter((u) => u.raw.includes(d.key)).map((u) => u.sub) }));
}

/** 边界句式：本章用它把「教学材料能做的」与「须由具备资质的人员做的」分开 */
const BOUNDARY = ['不作疾病诊断', '不具备判定的功能', '具备资质的人员', '不得混称', '敏感个人信息'];

function boundaryCount(list) {
  return list.reduce((n, u) => n + BOUNDARY.filter((p) => u.raw.includes(p)).length, 0);
}

function bySection(list) {
  const out = new Map();
  for (const u of list) {
    if (!out.has(u.sec)) out.set(u.sec, { units: 0, chars: 0, subs: [] });
    const g = out.get(u.sec);
    g.units += 1;
    g.chars += u.chars;
    g.subs.push(u.sub);
  }
  return out;
}

function report() {
  const base = loadBase();
  const list = chapterUnits(base);
  const meta = unitMeta(loadUnits())(list);
  const s = shape(list);
  const { views, levels } = lens(meta);
  const audit = valueAudit(meta);
  const faces = faceCoverage(list);
  const layers = layerCoverage(list);
  const diffs = diffCoverage(list);
  const boundary = boundaryCount(list);
  const secs = bySection(list);

  console.log('═══ 应激：类别、两层的环节、由调到变、边界（病理生理学 第7章）═══');
  console.log(`底本位置: 第7章 7.3–7.4 两节（章号取小节号本身，故引文写「第7章·7.3.1」）`);
  console.log(`教材规模: ${s.chars} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.chars / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角的 ${(share(views, k) * 100).toFixed(1)}%`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占四层级的 ${(share(levels, k) * 100).toFixed(1)}%`);
  console.log(`  → 词频以「${rank(views)[0][0]}」居首、落在「${rank(levels)[0][0]}」层：教材写的是环节怎么接，不是某个器官长什么样。`);
  console.log('');

  console.log(`两节的知识分布（节名 / 单元 / 汉字）：`);
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.chars} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('两面：神经内分泌（全身动员）与细胞（自保），同一目标、不同层面');
  for (const f of faces) {
    console.log(`  [${f.face}] ${f.label} · 落在 ${f.units.length} 单元（${f.units.join(' ') || '（无）'}）`);
  }
  console.log('');

  console.log('层次：功能调整 → 结构痕迹 → 功能紊乱（界线是「能否自行回转」，不是严重程度）');
  for (const l of layers) {
    console.log(`  ${l.key} · ${l.note} · 落在 ${l.units.length} 单元（${l.units.join(' ') || '（无）'}）`);
  }
  console.log('');

  console.log('个体差异的三类来源（并列列举，不排次序、不作优劣）：');
  for (const d of diffs) {
    console.log(`  ${d.key} · ${d.note} · 落在 ${d.units.length} 单元（${d.units.join(' ') || '（无）'}）`);
  }
  console.log('');

  console.log(`边界句式（不作疾病诊断 / 不具备判定的功能 / 具备资质的人员 / 不得混称 / 敏感个人信息）命中：${boundary} 处`);
  console.log('');

  console.log('教学边界：本章只说明教材的类别、环节与关系，不写数值与单位与参考值，不给分期与分度的界限，不作诊断、不作正常与异常判定，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, faces, layers, diffs, boundary, secs };
}

if (require.main === module) report();

module.exports = {
  ROOT,
  BASE,
  UNITS,
  CHAPTER,
  FACES,
  LAYERS,
  DIFF,
  BOUNDARY,
  loadBase,
  loadUnits,
  nonWs,
  secOf,
  chapterUnits,
  shape,
  unitMeta,
  lens,
  rank,
  total,
  share,
  valueAudit,
  faceCoverage,
  layerCoverage,
  diffCoverage,
  boundaryCount,
  bySection,
  report,
};
