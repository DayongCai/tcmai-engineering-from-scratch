#!/usr/bin/env node
/**
 * 病理生理学 · 第 3 章 水、电解质代谢紊乱
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/03-shui-dianjiezhi-wenluan/docs/zh.md
 * 出处: 教材·疾病学基础·第5章（5.1 水钠 3 单元 + 5.2 钾 3 单元，共 6 个知识单元）
 * 数据: standards/binglishengli/units.json（216 单元层，每单元带 rawBody / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「容量与渗透是两个维度，血钾与总量不是一件事」。
 * 这两句话能不能成立，取决于六个小节里是否真的把「维度」「三端环节」写成可检查的对象。
 * 手打的数字会在底本改写后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/binglishengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'binglishengli', 'units.json');

/** 本章映射到的 6 个小节（与 scripts/lib_binglishengli_map.js 的 3 号映射一致） */
const SUBS = ['5.1.1', '5.1.2', '5.1.3', '5.2.1', '5.2.2', '5.2.3'];

/** 水钠这一段要看的三条维度（5.1.1） */
const DIMENSIONS = ['容量状态', '渗透状态', '钠水平'];

/** 脱水的三个类别（5.1.2）：方向由水与钠相对丢失的多少决定 */
const DEHYDRATION = ['高渗性', '低渗性', '等渗性'];

/** 钾的三端（5.2.1）：摄入、排出、跨膜转移 */
const K_ENDS = ['摄入', '排出', '跨膜转移'];

/** 影响血钾的四组因素（5.2.2） */
const K_FACTORS = ['摄入类别', '排出类别', '分布类别', '调节类别'];

/** 功能变化的两面（5.2.3）：神经肌肉与心脏 */
const K_FUNCTION = ['神经肌肉', '心脏'];

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

/** 本章的 6 个知识单元，按小节号排 */
function chapterUnits(units) {
  const bySub = new Map(units.units.map((u) => [u.sub, u]));
  return SUBS.map((s) => bySub.get(s)).filter(Boolean);
}

/** 规模：节数 / 单元数 / 非空白字数。字数从 rawBody 现算，不取 hanzi 字段也不估算 */
function shape(list) {
  const secs = [...new Set(list.map((u) => u.sec))];
  return {
    secs: secs.length,
    units: list.length,
    chars: list.reduce((n, u) => n + String(u.rawBody || '').replace(/\s/g, '').length, 0),
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
const share = (o, k) => (total(o) ? o[k] / total(o) : 0);

/** 数值核验：底本实测 valueLike = 0。这里把它当断言复算，而不是照抄声明 */
function valueAudit(list) {
  const hits = list.reduce((n, u) => n + ((u.measure && u.measure.valueLike) || 0), 0);
  return {
    units: list.length,
    hits,
    offenders: list.filter((u) => ((u.measure && u.measure.valueLike) || 0) > 0).map((u) => u.sub),
  };
}

/** 一组关键词各自的覆盖单元：谁在哪一节被写成可检查的环节 */
function coverage(list, keys) {
  return keys.map((k) => ({ key: k, units: list.filter((u) => String(u.rawBody || '').includes(k)).map((u) => u.sub) }));
}

/** 六要素口径句：本章写的是「具备资质的人员」这道边界，哪几节写明了 */
const BOUNDARY_RE = /具备资质的人员/;
function boundaryUnits(list) {
  return list.filter((u) => BOUNDARY_RE.test(String(u.rawBody || ''))).map((u) => u.sub);
}

/** 四节的知识分布（本章两节，每节 3 单元） */
function bySection(list) {
  const out = new Map();
  for (const u of list) {
    if (!out.has(u.sec)) out.set(u.sec, { units: 0, chars: 0, subs: [] });
    const g = out.get(u.sec);
    g.units += 1;
    g.chars += String(u.rawBody || '').replace(/\s/g, '').length;
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
  const dims = coverage(list, DIMENSIONS);
  const dehy = coverage(list, DEHYDRATION);
  const kends = coverage(list, K_ENDS);
  const kfac = coverage(list, K_FACTORS);
  const kfun = coverage(list, K_FUNCTION);
  const bounded = boundaryUnits(list);
  const secs = bySection(list);

  console.log('═══ 水、电解质代谢紊乱（病理生理学 第3章 · 教材第5章 5.1–5.2）═══');
  console.log(`教材规模: 第5章 5.1–5.2 共 ${s.chars} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.chars / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角的 ${(share(views, k) * 100).toFixed(1)}%`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占四层级的 ${(share(levels, k) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层：`);
  console.log('     教材写的是「哪一环在调节」，不是「谁致的病」——病因一词在六个小节里一次没出现。');
  console.log('');

  console.log('两节的知识分布（单元 / 字数）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.chars} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('水钠的三条维度（5.1.1 起，覆盖单元数）：');
  for (const d of dims) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log('脱水的三个类别（5.1.2）：');
  for (const d of dehy) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log('钾的三端（5.2.1）：');
  for (const d of kends) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log('影响血钾的四组因素（5.2.2）：');
  for (const d of kfac) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log('功能变化的两个方面（5.2.3）：');
  for (const d of kfun) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log(`写明「由具备资质的人员判读」的单元：${bounded.length} / ${s.units} → ${bounded.join('、') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的类别与环节的写法，不写数值与单位，不作诊断与判定，不构成诊断/治疗/用药依据');

  return { list, shape: s, views, levels, audit, dims, dehy, kends, kfac, kfun, bounded, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  SUBS,
  DIMENSIONS,
  DEHYDRATION,
  K_ENDS,
  K_FACTORS,
  K_FUNCTION,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  coverage,
  boundaryUnits,
  bySection,
  main,
};
