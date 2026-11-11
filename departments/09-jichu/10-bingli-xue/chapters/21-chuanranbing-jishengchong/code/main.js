#!/usr/bin/env node
/**
 * 病理学 · 第21章 常见传染病及寄生虫病：把九种病压成一张对照表
 * 课程: departments/09-jichu/10-bingli-xue/chapters/21-chuanranbing-jishengchong/docs/zh.md
 * 出处: 教材·第21章（21.1–21.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元的机器可读层）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章表面上是「九种病各讲一遍」，实际骨架是「病变的部位 × 基本病变 ×
 * 溃疡形态」三维对照。三维对照能不能成立，取决于教材有没有把同一组维度用在每种病上；
 * 这一点只能靠数：哪种病被写了几个单元、哪几个形态词跨了几种病。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
const CHAPTER = '21';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units, no = CHAPTER) {
  return units.units
    .filter((u) => u.chapter === no)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
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

function valueAudit(list) {
  const hits = list.reduce((n, u) => n + (u.measure.valueLike || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];

function sixElementUnits(list) {
  return list.filter((u) => SIX.every((k) => (u.body || '').includes(k))).map((u) => u.sub);
}

const countWord = (text, w) => (text.match(new RegExp(w, 'g')) || []).length;

/** 本章摊开的九种病：结核病（含肺结核、血源性）、伤寒、细菌性痢疾、阿米巴病、
 *  钩端螺旋体病、流行性出血热、性传播性疾病、血吸虫病、深部真菌病 */
const DISEASES = [
  '结核病',
  '伤寒',
  '细菌性痢疾',
  '阿米巴病',
  '钩端螺旋体病',
  '流行性出血热',
  '性传播性疾病',
  '血吸虫病',
  '深部真菌病',
];

/** 每种病在几个单元里被写到、合计几次 */
function diseaseAxis(list) {
  const text = list.map((u) => u.body || '').join('');
  return DISEASES.map((d) => ({
    name: d,
    hits: countWord(text, d),
    units: list.filter((u) => (u.body || '').includes(d)).map((u) => u.sub),
  }));
}

/** 三维对照的六个形态词：部位 / 基本病变 / 溃疡形态 */
const SHAPE_WORDS = ['溃疡', '肉芽肿', '干酪样坏死', '假膜', '溶解', '出血'];

function shapeAxis(list) {
  const text = list.map((u) => u.body || '').join('');
  return SHAPE_WORDS.map((w) => ({
    word: w,
    hits: countWord(text, w),
    units: list.filter((u) => (u.body || '').includes(w)).length,
  }));
}

/** 溃疡形态的两条判据：伤寒的「长轴平行」与痢疾的「地图状」 */
function ulcerAxis(list) {
  const text = list.map((u) => u.body || '').join('');
  return {
    长轴平行: countWord(text, '长轴'),
    地图状: countWord(text, '地图状'),
    烧瓶状: countWord(text, '烧瓶状'),
    口小底大: countWord(text, '口小底大'),
    椭圆形: countWord(text, '椭圆形'),
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
  const six = sixElementUnits(list);
  const dis = diseaseAxis(list);
  const shapes = shapeAxis(list);
  const ulcer = ulcerAxis(list);
  const secs = bySection(list);

  console.log('═══ 常见传染病及寄生虫病：把九种病压成一张对照表（病理学 第21章）═══');
  console.log(`教材规模: 第${CHAPTER}章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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

  console.log('四节的知识分布：');
  for (const [sec, g] of [...secs.entries()].sort()) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('九种病在本章的落点（次数 / 出现在哪些单元）：');
  for (const d of dis) {
    console.log(`  ${d.name} ${String(d.hits).padStart(3)} 次 · ${d.units.join(' ') || '（未提及）'}`);
  }
  console.log('');

  console.log('三维对照用的形态词（次数 / 覆盖单元数）：');
  for (const w of shapes) console.log(`  ${w.word} ${String(w.hits).padStart(3)} 次 · ${w.units} 单元`);
  console.log('');
  console.log(`溃疡形态的四个判据：长轴 ${ulcer.长轴平行} · 地图状 ${ulcer.地图状} · 烧瓶状 ${ulcer.烧瓶状} · 口小底大 ${ulcer.口小底大} · 椭圆形 ${ulcer.椭圆形}`);
  console.log('');
  console.log(`六要素（观察/描述/记录/分析/报告/复核）写全的单元：${six.length} / ${s.units} → ${six.join(' ') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的病变形态与类别对照，不写数值与单位与参考值，不构成诊断、治疗或用药依据');

  return { list, shape: s, views, levels, audit, six, dis, shapes, ulcer, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  SIX,
  DISEASES,
  SHAPE_WORDS,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  countWord,
  diseaseAxis,
  shapeAxis,
  ulcerAxis,
  bySection,
  main,
};
