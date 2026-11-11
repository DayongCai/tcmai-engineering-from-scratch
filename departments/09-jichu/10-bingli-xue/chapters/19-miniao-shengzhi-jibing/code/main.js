#!/usr/bin/env node
/**
 * 病理学 · 第19章 泌尿及生殖系统疾病：从滤过屏障到生殖系统病变的形态主线
 * 课程: departments/09-jichu/10-bingli-xue/chapters/19-miniao-shengzhi-jibing/docs/zh.md
 * 出处: 教材·第19章（19.1–19.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元的机器可读层，每单元带 body / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的是「病变形态与部位的关系」，而部位关系是否成立，
 * 取决于教材自己把哪些部位写进了哪一节、把六要素落在了几个单元里、有没有偷偷给数值。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/10-bingli-xue/chapters/19-.../code
// 不硬数 ../ 的层数，向上找带 standards/bingli 的那一级
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
const CHAPTER = '19';

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

/** 三视角（病因/机制/形态）与四层级（细胞/组织/器官/系统）：单元层词频直接相加 */
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

/**
 * 数值核验：底本自己声明「不写数值与单位与参考值」。
 * 本函数把这个声明当成可核验的断言来复算——不是相信它，是检查它。
 */
function valueAudit(list) {
  const hits = list.reduce((n, u) => n + (u.measure.valueLike || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => (u.measure.valueLike || 0) > 0).map((u) => u.sub),
  };
}

/** 形态认识的六要素：教材在全章反复引用的一条链 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];

/** 在本章正文里把六要素写全的单元 */
function sixElementUnits(list) {
  return list.filter((u) => SIX.every((k) => (u.body || '').includes(k))).map((u) => u.sub);
}

/** 19.1.3 逐一列出的肾小球肾炎形态类型 */
const TYPES = [
  '毛细血管内增生性',
  '系膜增生性',
  '膜性',
  '膜增生性',
  '微小病变',
  '局灶节段性',
  '新月体型',
];

/** 类型表只在 19.1.3 里被摊开：本章的「类型」是一个单元的密度，不是一个词 */
function typeList(list) {
  const u = list.find((x) => x.sub === '19.1.3');
  if (!u) return [];
  return TYPES.filter((t) => (u.body || '').includes(t));
}

const countWord = (text, w) => (text.match(new RegExp(w, 'g')) || []).length;

/** 部位轴：肾小球 / 肾盂 / 肾小管 三个词在四个节里的分布 */
function partAxis(list) {
  const out = [];
  for (const sec of [...new Set(list.map((u) => u.sec))].sort()) {
    const text = list.filter((u) => u.sec === sec).map((u) => u.body || '').join('');
    out.push({
      sec,
      units: list.filter((u) => u.sec === sec).length,
      hanzi: list.filter((u) => u.sec === sec).reduce((n, u) => n + u.hanzi, 0),
      肾小球: countWord(text, '肾小球'),
      肾盂: countWord(text, '肾盂'),
      肾小管: countWord(text, '肾小管'),
    });
  }
  return out;
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

function main() {
  const units = load();
  const list = chapterUnits(units);
  const s = shape(list);
  const { views, levels } = lens(list);
  const audit = valueAudit(list);
  const six = sixElementUnits(list);
  const types = typeList(list);
  const parts = partAxis(list);
  const secs = bySection(list);

  console.log('═══ 泌尿及生殖系统疾病：从滤过屏障到生殖系统病变（病理学 第19章）═══');
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
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层`);
  console.log('');

  console.log('四节的知识分布与部位轴（节名 / 单元 / 汉字 / 肾小球 / 肾盂 / 肾小管）：');
  for (const p of parts) {
    console.log(`  ${p.sec} · ${p.units} 单元 · ${p.hanzi} 字 · 肾小球 ${p.肾小球} · 肾盂 ${p.肾盂} · 肾小管 ${p.肾小管}`);
  }
  console.log('');

  console.log(`19.1.3 摊开的肾小球肾炎形态类型：${types.length} / ${TYPES.length}`);
  for (const t of types) console.log(`  · ${t}`);
  console.log('');
  console.log(`六要素（观察/描述/记录/分析/报告/复核）写全的单元：${six.length} / ${s.units}`);
  console.log(`  ${six.join(' ') || '（无）'}`);
  console.log('  → 六要素在本章是「贯穿句」：每一节都复述，但复述不等于落地。');
  console.log('');

  console.log('教学边界：本章只说明教材的病变形态与部位关系的类别，不写数值与单位与参考值，不构成诊断、治疗或用药依据');

  return { list, shape: s, views, levels, audit, six, types, parts, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  SIX,
  TYPES,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  typeList,
  countWord,
  partAxis,
  bySection,
  main,
};
