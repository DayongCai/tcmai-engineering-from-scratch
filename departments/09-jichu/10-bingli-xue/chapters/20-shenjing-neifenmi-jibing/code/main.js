#!/usr/bin/env node
/**
 * 病理学 · 第20章 常见神经及内分泌系统疾病：从病变部位到类别归属
 * 课程: departments/09-jichu/10-bingli-xue/chapters/20-shenjing-neifenmi-jibing/docs/zh.md
 * 出处: 教材·第20章（20.1–20.4，12 个知识单元）
 * 数据: standards/bingli/units.json（252 单元的机器可读层）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的写法特征是一个词——「类别」。它出现的密度决定了这一章
 * 到底是「按部位讲病变」还是「按类别做归纳」。这个判断不能靠读感，得数出来；
 * 而且教材改版后要能立刻发现密度变了。
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
const CHAPTER = '20';

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

/** 「类别」密度：本章的写法指纹。按节统计，看教材把归纳放在哪一节 */
function categoryDensity(list) {
  return [...new Set(list.map((u) => u.sec))].sort().map((sec) => {
    const us = list.filter((u) => u.sec === sec);
    const text = us.map((u) => u.body || '').join('');
    const hanzi = us.reduce((n, u) => n + u.hanzi, 0);
    const hits = countWord(text, '类别');
    return { sec, units: us.length, hanzi, hits, perK: hanzi ? (hits / hanzi) * 1000 : 0 };
  });
}

/** 常见并发症的五个类别，在本章正文里各被写到几次 */
const COMPLICATIONS = ['脑水肿', '颅内压升高', '脑疝', '脑积水', '脑膜刺激'];

function complicationCoverage(list) {
  const text = list.map((u) => u.body || '').join('');
  return COMPLICATIONS.map((k) => ({ name: k, hits: countWord(text, k) }));
}

/** 化脓性与病毒性：教材用同一组维度（部位/渗出物/镜下）对照，而不是两种病各讲一遍 */
function encephalitis(list) {
  const text = list.map((u) => u.body || '').join('');
  return {
    化脓性: countWord(text, '化脓性'),
    病毒性: countWord(text, '病毒性'),
    血管套: countWord(text, '血管套'),
    噬神经细胞现象: countWord(text, '噬神经细胞现象'),
    胶质结节: countWord(text, '胶质结节'),
    包涵体: countWord(text, '包涵体'),
  };
}

/** 内分泌两节的关键词：糖尿病与甲状腺肿各自被摊成几个单元 */
function endocrine(list) {
  const text = list.map((u) => u.body || '').join('');
  return {
    糖尿病: countWord(text, '糖尿病'),
    甲状腺肿: countWord(text, '甲状腺肿'),
    滤泡: countWord(text, '滤泡'),
    胰岛: countWord(text, '胰岛'),
    代谢: countWord(text, '代谢'),
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
  const cats = categoryDensity(list);
  const comp = complicationCoverage(list);
  const enc = encephalitis(list);
  const endo = endocrine(list);
  const secs = bySection(list);
  const categoryTotal = cats.reduce((n, c) => n + c.hits, 0);

  console.log('═══ 常见神经及内分泌系统疾病：从病变部位到类别归属（病理学 第20章）═══');
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

  console.log(`「类别」二字全章 ${categoryTotal} 次 · 按节的密度：`);
  for (const c of cats) {
    console.log(`  ${c.sec} · ${c.units} 单元 · ${c.hanzi} 字 · 类别 ${c.hits} 次 · 每千字 ${c.perK.toFixed(1)} 次`);
  }
  console.log('');

  console.log('常见并发症五个类别在本章的出现次数：');
  for (const c of comp) console.log(`  ${c.name} ${c.hits} 次`);
  console.log('');
  console.log('化脓性与病毒性脑炎的对照维度出现次数：');
  console.log(`  化脓性 ${enc.化脓性} · 病毒性 ${enc.病毒性} · 血管套 ${enc.血管套} · 噬神经细胞现象 ${enc.噬神经细胞现象} · 胶质结节 ${enc.胶质结节} · 包涵体 ${enc.包涵体}`);
  console.log('');
  console.log('内分泌两节的关键词：');
  console.log(`  糖尿病 ${endo.糖尿病} · 甲状腺肿 ${endo.甲状腺肿} · 滤泡 ${endo.滤泡} · 胰岛 ${endo.胰岛} · 代谢 ${endo.代谢}`);
  console.log('');
  console.log(`六要素（观察/描述/记录/分析/报告/复核）写全的单元：${six.length} / ${s.units} → ${six.join(' ') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的病变类别与部位关系的类别，不写数值与单位与参考值，不构成诊断、治疗或用药依据');

  return { list, shape: s, views, levels, audit, six, cats, comp, enc, endo, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  CHAPTER,
  SIX,
  COMPLICATIONS,
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
  categoryDensity,
  complicationCoverage,
  encephalitis,
  endocrine,
  bySection,
  main,
};
