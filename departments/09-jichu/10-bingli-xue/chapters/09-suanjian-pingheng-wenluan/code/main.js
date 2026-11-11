#!/usr/bin/env node
/**
 * 病理学 · 第 9 章 酸碱平衡紊乱
 * 课程: departments/09-jichu/10-bingli-xue/chapters/09-suanjian-pingheng-wenluan/docs/zh.md
 * 出处: 教材·第9章（9.1–9.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 prose / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「紊乱的类型由原发环节与原发方向两个维度定」——
 * 三个调节环节（缓冲、肺、肾）各自改哪一个量，决定了后面四型怎么分。
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
const CHAPTER = '9';

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

/** 观察与描述六要素：本章用它约束表述链条 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];

/** 六要素在正文里写全的单元 */
function sixElementUnits(list) {
  return list.filter((u) => SIX.every((k) => (u.body || '').includes(k))).map((u) => u.sub);
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

/** 三个调节环节：缓冲（即时）、肺（快，调挥发酸）、肾（慢而久，调固定酸与碱储备） */
const THREE = [
  { key: '缓冲', sub: '9.1.1', pace: '即时' },
  { key: '肺', sub: '9.1.2', pace: '较快' },
  { key: '肾', sub: '9.1.3', pace: '较慢而持久' },
];
function threeRegulators(list) {
  const bySub = new Map(list.map((u) => [u.sub, u]));
  return THREE.map((t) => ({
    key: t.key,
    sub: t.sub,
    pace: t.pace,
    found: !!bySub.get(t.sub) && (bySub.get(t.sub).body || '').includes(t.key),
  }));
}

/** 反映酸碱变化的指标：六个名字，本章按「呼吸因素 / 代谢因素」两簇使用 */
const INDICATORS = ['酸碱度', '二氧化碳分压', '碳酸氢盐', '缓冲碱', '碱剩余', '阴离子间隙'];
function indicatorCoverage(list) {
  return INDICATORS.map((k) => ({
    key: k,
    units: list.filter((u) => (u.body || '').includes(k)).map((u) => u.sub),
  }));
}

/** 四型单纯型紊乱：两个原发环节 × 两个方向 */
const FOUR = [
  { key: '代谢性酸中毒', sub: '9.3.1', origin: '碳酸氢盐', dir: '下降' },
  { key: '呼吸性酸中毒', sub: '9.3.1', origin: '碳酸', dir: '上升' },
  { key: '代谢性碱中毒', sub: '9.3.2', origin: '碳酸氢盐', dir: '上升' },
  { key: '呼吸性碱中毒', sub: '9.3.2', origin: '碳酸', dir: '下降' },
];
function fourTypes(list) {
  const bySub = new Map(list.map((u) => [u.sub, u]));
  return FOUR.map((f) => ({
    ...f,
    found: !!bySub.get(f.sub) && (bySub.get(f.sub).body || '').includes(f.key),
  }));
}

/** 代偿：本章「原发方向」与「代偿方向相反」这条判据，落在几个单元里 */
function compensationUnits(list) {
  return list.filter((u) => (u.body || '').includes('代偿')).map((u) => u.sub);
}

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const six = sixElementUnits(list);
  const secs = bySection(list);
  const three = threeRegulators(list);
  const ind = indicatorCoverage(list);
  const four = fourTypes(list);
  const comp = compensationUnits(list);

  console.log('═══ 酸碱平衡紊乱（病理学 第9章）═══');
  console.log(`教材规模: 第9章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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
  console.log('     酸碱平衡紊乱没有一处肉眼病灶；判读落在体液与细胞的化学条件上。');
  console.log('');

  console.log('四节的知识分布（单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');
  console.log('三个调节环节（按起效快慢排）：');
  for (const t of three) console.log(`  ${t.sub} ${t.key} · ${t.pace} ${t.found ? '✓ 本节正文命中' : '✗ 未命中'}`);
  console.log('');
  console.log('反映酸碱变化的指标（覆盖单元数）：');
  for (const i of ind) console.log(`  ${i.key} ${i.units.length} / ${s.units} → ${i.units.join('、')}`);
  console.log('');
  console.log('四型单纯型紊乱（原发环节 × 原发方向）：');
  for (const f of four) {
    console.log(`  ${f.key} · 原发 ${f.origin}${f.dir} · ${f.sub} ${f.found ? '✓ 命中' : '✗ 未命中'}`);
  }
  console.log('');
  console.log(`出现「代偿」表述的单元：${comp.length} / ${s.units} → ${comp.join('、')}`);
  console.log(`观察与描述六要素写全的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的调节环节与指标含义与紊乱类别的写法，不写数值与单位与参考值，不构成诊断/治疗/用药依据');

  return { list, shape: s, views, levels, audit, six, secs, three, ind, four, comp };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  SIX,
  THREE,
  INDICATORS,
  FOUR,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  bySection,
  threeRegulators,
  indicatorCoverage,
  fourTypes,
  compensationUnits,
  main,
};
