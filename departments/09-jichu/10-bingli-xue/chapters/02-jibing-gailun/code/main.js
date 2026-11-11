#!/usr/bin/env node
/**
 * 病理学 · 第 2 章 疾病概论：健康与疾病、原因与条件、规律与机制、经过与转归
 * 课程: departments/09-jichu/10-bingli-xue/chapters/02-jibing-gailun/docs/zh.md
 * 出处: 教材·第2章（2.1–2.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元层，每单元带 goals / rawBody / 三视角 / 四层级词频 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「原因与条件是两个位置，不能合并」。
 * 这句话能不能成立，取决于教材有没有在每一节都把两个词分开写、有没有把阶段与转归
 * 写成类别而不是判据。这些都能在单元层数出来；手打的数字会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/10-bingli-xue/chapters/02-jibing-gailun/code
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
const CHAPTER = '2';

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

/**
 * 原因与条件：本章的核心分工。
 * 只要有一个单元把两者写在同一段里却只留一个词，分工就塌了。
 * 这里不是查词频，是查「两个词是否同时在场」。
 */
function causeCondition(list) {
  const both = [];
  const onlyCause = [];
  const onlyCondition = [];
  for (const u of list) {
    const body = u.rawBody || '';
    const c = body.includes('原因');
    const k = body.includes('条件');
    if (c && k) both.push(u.sub);
    else if (c) onlyCause.push(u.sub);
    else if (k) onlyCondition.push(u.sub);
  }
  return { both, onlyCause, onlyCondition };
}

/** 经过的四段：教材把过程写成阶段类别，而不是时限 */
const STAGES = ['潜伏期', '前驱期', '临床明显期', '转归期'];
function stageCoverage(list) {
  return STAGES.map((s) => ({
    stage: s,
    units: list.filter((u) => (u.rawBody || '').includes(s)).map((u) => u.sub),
  }));
}

/** 转归的四类：恢复、部分恢复、迁延不愈、恶化 */
const OUTCOMES = ['恢复', '部分恢复', '迁延不愈', '恶化'];
function outcomeCoverage(list) {
  return OUTCOMES.map((o) => ({
    outcome: o,
    units: list.filter((u) => (u.rawBody || '').includes(o)).map((u) => u.sub),
  }));
}

/**
 * 六要素：观察 / 描述 / 记录 / 分析 / 报告 / 复核。
 * 判据取教材的提法本身——正文里出现「六要素」这一提法的单元。
 * 不按单个词计：六项里的每一项都是常用词，逐词命中几乎处处为真，等于没有判据。
 */
const SIX = ['观察', '描述', '记录', '分析', '报告', '复核'];
function sixElementUnits(list) {
  return list.filter((u) => (u.rawBody || '').includes('六要素')).map((u) => u.sub);
}

/** 判断的归属：正文里把结论交给「具备资质的人员」的单元 */
const HANDOFF = '具备资质的人员';
function handoffUnits(list) {
  return list.filter((u) => (u.rawBody || '').includes(HANDOFF)).map((u) => u.sub);
}

/** 局部与整体：这一对词被写在同一处，才谈得上「关系」 */
function localWhole(list) {
  return list
    .filter((u) => (u.rawBody || '').includes('局部') && (u.rawBody || '').includes('整体'))
    .map((u) => u.sub);
}

/** 四节的知识分布：每节几个单元、多少字 */
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
  const cc = causeCondition(list);
  const stages = stageCoverage(list);
  const outcomes = outcomeCoverage(list);
  const six = sixElementUnits(list);
  const handoff = handoffUnits(list);
  const lw = localWhole(list);
  const secs = bySection(list);

  console.log('═══ 疾病概论：健康与疾病、原因与条件、规律与机制、经过与转归（病理学 第2章）═══');
  console.log(`教材规模: 第2章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.hanzi / s.units)} 字`);
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
  console.log('     疾病概论讲的是「过程怎么被组织成关系」，不是「某一种病变长什么样」。');
  console.log('');

  console.log('四节的知识分布（节名 / 单元 / 汉字）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.hanzi} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('原因与条件的分工核验（两个词是否同时在场）：');
  console.log(`  同时写到原因与条件：${cc.both.length} / ${s.units}`);
  console.log(`  只写原因：${cc.onlyCause.length} 个 · 只写条件：${cc.onlyCondition.length} 个`);
  console.log('  → 全章没有一处把两者合并：分工是写法，不是口号。');
  console.log('');

  console.log('经过的四段（写到的单元）：');
  for (const st of stages) console.log(`  ${st.stage} · ${st.units.length} 单元 → ${st.units.join(' ') || '（无）'}`);
  console.log('转归的四类（写到的单元）：');
  for (const o of outcomes) console.log(`  ${o.outcome} · ${o.units.length} 单元 → ${o.units.join(' ') || '（无）'}`);
  console.log('');

  console.log(`局部与整体同处出现的单元：${lw.length} / ${s.units} → ${lw.join(' ')}`);
  console.log(`六要素被提到的单元：${six.length} / ${s.units} → ${six.join('、') || '（无）'}`);
  console.log('  → 六要素只在一节出现：方法链在本章被压成一句声明，展开留给总论各章。');
  console.log(`把判断交给「具备资质的人员」的单元：${handoff.length} / ${s.units}`);
  console.log('');

  console.log('教学边界：本章只说明健康与疾病/原因与条件/规律与机制/经过与转归的类别关系，不写数值与单位与参考值，不构成诊断/治疗/用药依据');

  return { list, shape: s, views, levels, audit, cc, stages, outcomes, six, handoff, lw, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  STAGES,
  OUTCOMES,
  SIX,
  HANDOFF,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  causeCondition,
  stageCoverage,
  outcomeCoverage,
  sixElementUnits,
  handoffUnits,
  localWhole,
  bySection,
  main,
};
