#!/usr/bin/env node
/**
 * 病理生理学 · 第 4 章 酸碱平衡紊乱
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/04-suanjian-pingheng-wenluan/docs/zh.md
 * 出处: 教材·疾病学基础·第5章（5.3 酸碱 3 单元 + 5.4 调节与整体联系 3 单元，共 6 个知识单元）
 * 数据: standards/binglishengli/units.json（216 单元层，每单元带 rawBody / 三视角 / 四层级 / 数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「起因定方向，代偿定表现」，而四类紊乱共用一套调节环节。
 * 这条命题能不能成立，取决于底本是否真的只写方向而不写参数——所以数值那一行必须由程序复算，
 * 不能靠作者在文档里声明「本书不写数值」。
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

/** 本章映射到的 6 个小节（与 scripts/lib_binglishengli_map.js 的 4 号映射一致） */
const SUBS = ['5.3.1', '5.3.2', '5.3.3', '5.4.1', '5.4.2', '5.4.3'];

/** 四个基本类别：代谢端两类、呼吸端两类（5.3.1–5.3.3） */
const FOUR = ['代谢性酸中毒', '呼吸性酸中毒', '代谢性碱中毒', '呼吸性碱中毒'];

/** 三级调节：缓冲 / 呼吸 / 肾（5.4.1），快慢不同、作用持久性不同 */
const STAGES = ['缓冲系统', '呼吸环节', '肾环节'];

/** 起因与代偿两端：本章的主轴（5.3.1 起） */
const ENDS = ['起因', '代偿'];

/** 只能写方向、不能写量的两处：阴离子间隙与代偿充分与否 */
const QUALITATIVE = ['阴离子间隙', '代偿充分'];

/** 边界句：由具备资质的人员判读（5.4.3 是它的正面表述） */
const BOUNDARY_RE = /具备资质的人员/;

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

/** 写明「由具备资质的人员判读」的单元 */
function boundaryUnits(list) {
  return list.filter((u) => BOUNDARY_RE.test(String(u.rawBody || ''))).map((u) => u.sub);
}

/** 两节的知识分布（本章两节，每节 3 单元） */
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
  const four = coverage(list, FOUR);
  const stages = coverage(list, STAGES);
  const ends = coverage(list, ENDS);
  const qual = coverage(list, QUALITATIVE);
  const bounded = boundaryUnits(list);
  const secs = bySection(list);

  console.log('═══ 酸碱平衡紊乱（病理生理学 第4章 · 教材第5章 5.3–5.4）═══');
  console.log(`教材规模: 第5章 5.3–5.4 共 ${s.chars} 字 · ${s.secs} 节 · ${s.units} 单元 · 平均每单元 ${Math.round(s.chars / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 单元的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里复算而不是照抄声明）`);
  console.log('');

  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占三视角的 ${(share(views, k) * 100).toFixed(1)}%`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次 · 占四层级的 ${(share(levels, k) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  → 本章以「${rank(views)[0][0]}」为主轴、落在「${rank(levels)[0][0]}」层：`);
  console.log('     教材写的是「哪一环在代偿、朝哪个方向」，不是「谁致的病」——病因一词在六个小节里一次未现。');
  console.log('');

  console.log('两节的知识分布（单元 / 字数）：');
  for (const [sec, g] of [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`  ${sec} · ${g.units} 单元 · ${g.chars} 字 · ${g.subs.join(' ')}`);
  }
  console.log('');

  console.log('四个基本类别（代谢端两类 / 呼吸端两类）：');
  for (const d of four) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log('三级调节（缓冲 / 呼吸 / 肾）：');
  for (const d of stages) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log('起因与代偿两端（本章主轴）：');
  for (const d of ends) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log('只能写方向、不能写量的两处：');
  for (const d of qual) console.log(`  ${d.key} ${d.units.length} / ${s.units} → ${d.units.join('、') || '（无）'}`);
  console.log('');
  console.log(`写明「由具备资质的人员判读」的单元：${bounded.length} / ${s.units} → ${bounded.join('、') || '（无）'}`);
  console.log('');

  console.log('教学边界：本章只说明教材的起因与代偿的写法，不写数值与单位，不作诊断与判定，不构成诊断/治疗/用药依据');

  return { list, shape: s, views, levels, audit, four, stages, ends, qual, bounded, secs };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  UNITS,
  SUBS,
  FOUR,
  STAGES,
  ENDS,
  QUALITATIVE,
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
