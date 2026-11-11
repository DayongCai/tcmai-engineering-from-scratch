#!/usr/bin/env node
/**
 * 病理生理学 · 第 9 章 休克：概念、四类起点、分期三段与微循环环节
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/09-xiuke/docs/zh.md
 * 出处: 教材·疾病学基础·第7章（7.1.1–7.2.3，6 个知识单元）
 * 数据: standards/binglishengli/底本.json + standards/binglishengli/units.json
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「休克不是血压掉下来的那一刻，而是一条环节链」。
 * 链条是否成立，取决于教材有没有真把四类起点、三期的判据、微循环三个部位的环节写出来，
 * 也取决于它有没有偷偷给出阈值与时限。手打的数字会在底本改版后静默过期。
 *
 * 一处必须记住的口径：本章的「章」指课程第 9 章，其底本位置是**底本第 7 章的 7.1、7.2 两节**。
 * 底本 7.3、7.4 属课程第 7 章（应激）。引文的章号取小节号本身，故写「第7章·7.1.1」。
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

/** 课程章号（本课 9 = 休克） */
const CHAPTER = 9;

const loadBase = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const loadUnits = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

const nonWs = (s) => String(s || '').replace(/\s/g, '');
const secOf = (sub) => String(sub).split('.').slice(0, 2).join('.');

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

function valueAudit(meta) {
  const hits = meta.reduce((n, u) => n + ((u.measure && u.measure.valueLike) || 0), 0);
  return {
    units: meta.length,
    hits,
    offenders: meta.filter((u) => ((u.measure && u.measure.valueLike) || 0) > 0).map((u) => u.sub),
  };
}

/**
 * 四类起点：容量 / 泵 / 分布 / 通路。
 * 前两类是「血不够、推不动」，后两类是「分错了、路不通」——这是本章唯一的分组依据。
 */
const STARTS = [
  { key: '血容量', label: '血容量明显丢失为主', group: '量与泵' },
  { key: '心脏泵血', label: '心脏泵血功能减退为主', group: '量与泵' },
  { key: '血管舒缩', label: '血管舒缩与分布异常为主', group: '分布与通路' },
  { key: '循环通路', label: '循环通路受阻为主', group: '分布与通路' },
];

function startCoverage(list) {
  return STARTS.map((s) => ({ ...s, units: list.filter((u) => u.raw.includes(s.key)).map((u) => u.sub) }));
}

/**
 * 分期三段：判据是「代偿还在不在覆盖」，不是时长。
 * 教材不给时限，所以这里只统计「哪一段被写到了、写在哪个单元」，不统计任何时间量。
 * home = 该段微循环环节所在的单元；7.1.2 是三段一起命名的地方（分期本体）。
 */
const STAGES = [
  { name: '代偿期', home: '7.2.1', judge: '调节尚能覆盖冲击，以增加调节负荷换取灌注稳定' },
  { name: '进展期', home: '7.2.2', judge: '代偿与失代偿并存，失代偿成分逐步增加' },
  { name: '难治期', home: '7.2.3', judge: '对常规调节反应缺乏应答；只描述环节，不判定结局' },
];

function stageCoverage(list) {
  return STAGES.map((s) => ({ ...s, units: list.filter((u) => u.raw.includes(s.name)).map((u) => u.sub) }));
}

/** 微循环的三个部位 + 一个目标：调的是前后阻力的比值，不是一个绝对值 */
const SITES = [
  { key: '微动脉', note: '动脉端阻力' },
  { key: '毛细血管', note: '灌流量与流速' },
  { key: '微静脉', note: '容纳与回流' },
  { key: '物质交换', note: '这一层的目标函数' },
];

function siteCoverage(list) {
  return SITES.map((s) => ({ ...s, units: list.filter((u) => u.raw.includes(s.key)).map((u) => u.sub) }));
}

/** 相邻接缝：与应激、与凝血/纤溶（第 10 章缺稿，只标位置不展开） */
const SEAMS = [
  { key: '应激', note: '休克与应激彼此影响、彼此强化（接第 7 章）' },
  { key: '凝血', note: '难治期的一类环节（第 10 章在底本中无内容，不展开）' },
];

function seamCoverage(list) {
  return SEAMS.map((s) => ({ ...s, units: list.filter((u) => u.raw.includes(s.key)).map((u) => u.sub) }));
}

/** 边界句式：本章用它把「描述环节」与「判定个体」分开 */
const BOUNDARY = ['不作疾病诊断', '具备资质的人员', '不得混称', '敏感个人信息', '并不承担这一功能'];

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
  const starts = startCoverage(list);
  const stages = stageCoverage(list);
  const sites = siteCoverage(list);
  const seams = seamCoverage(list);
  const boundary = boundaryCount(list);
  const secs = bySection(list);

  console.log('═══ 休克：概念、四类起点、分期三段与微循环环节（病理生理学 第9章）═══');
  console.log('底本位置: 第7章 7.1–7.2 两节（章号取小节号本身，故引文写「第7章·7.1.1」）');
  console.log(`教材规模: ${s.chars} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.chars / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角的 ${(share(views, k) * 100).toFixed(1)}%`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占四层级的 ${(share(levels, k) * 100).toFixed(1)}%`);
  console.log(`  → 词频以「${rank(views)[0][0]}」居首、落在「${rank(levels)[0][0]}」层：教材写的是环节链怎么接，不是某个器官的形态改变。`);
  console.log('');

  console.log('两节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.chars} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('四类起点（前两类「血不够、推不动」，后两类「分错了、路不通」）：');
  for (const st of starts) {
    console.log(`  [${st.group}] ${st.label} · 落在 ${st.units.length} 单元（${st.units.join(' ') || '（无）'}）`);
  }
  console.log('');

  console.log('分期三段（判据是「代偿还在不在覆盖」，不是时长；教材不给时限）：');
  for (const st of stages) {
    console.log(`  ${st.name} · ${st.judge} · 本体在 ${st.home} · 被提到 ${st.units.length} 单元（${st.units.join(' ') || '（无）'}）`);
  }
  console.log('');

  console.log('微循环三个部位 + 目标函数（调的是前后阻力的比值，不是一个绝对值）：');
  for (const x of sites) {
    console.log(`  ${x.key} · ${x.note} · 落在 ${x.units.length} 单元（${x.units.join(' ') || '（无）'}）`);
  }
  console.log('');

  console.log('相邻接缝（只标位置，不替缺稿章展开）：');
  for (const x of seams) {
    console.log(`  ${x.key} · ${x.note} · 落在 ${x.units.length} 单元（${x.units.join(' ') || '（无）'}）`);
  }
  console.log('');

  console.log(`边界句式（不作疾病诊断 / 具备资质的人员 / 不得混称 / 敏感个人信息 / 并不承担这一功能）命中：${boundary} 处`);
  console.log('');

  console.log('教学边界：本章只说明教材的类别、环节与关系，不写数值与单位与参考值，不给血压阈值与分期界限，不作诊断、不作正常与异常判定、不作预后与转归判定，不构成诊断/用药依据');

  return { list, shape: s, views, levels, audit, starts, stages, sites, seams, boundary, secs };
}

if (require.main === module) report();

module.exports = {
  ROOT,
  BASE,
  UNITS,
  CHAPTER,
  STARTS,
  STAGES,
  SITES,
  SEAMS,
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
  startCoverage,
  stageCoverage,
  siteCoverage,
  seamCoverage,
  boundaryCount,
  bySection,
  report,
};
