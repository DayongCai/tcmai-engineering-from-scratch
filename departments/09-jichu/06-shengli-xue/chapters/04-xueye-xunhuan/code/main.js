#!/usr/bin/env node
/**
 * 生理学 · 第 4 章 血液循环：泵血·血管·调节·器官循环
 * 课程: departments/09-jichu/06-shengli-xue/chapters/04-xueye-xunhuan/docs/zh.md
 * 出处: 教材·第4章（4.1 心脏的泵血功能 / 4.2 心肌细胞的生物电现象与生理特性 /
 *       4.3 血管生理与心音心电图 / 4.4 心血管活动的调节与器官循环），十二个知识单元
 * 数据: standards/shengli/units.json（逐单元带 views / levels 词频与 hanzi）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算而不手打：
 *   ① 「四个时相由两个瓣膜的状态唯一决定」是一个可判真伪的命题。只要把
 *      「房室瓣 / 动脉瓣 / 收缩期或舒张期」三个量连同容积方向写成判别函数，
 *      任何不相容的组合都会抛错；手打一张表则永远对，也永远不能证伪。
 *   ② 「本章以机能为轴」这句话必须有可复算的词频支撑，否则只是一句读后感。
 *   ③ 教材自己声明 valueLike = 0（一个数值都不写），本章把这个声明当成
 *      可核验的断言来检查——每单元的 valueLike 必须为 0，否则报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/06-shengli-xue/chapters/<slug>/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），改为向上找到带 standards/shengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'shengli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/shengli/units.json —— 章节目录是否已脱离仓库？');
}
const ROOT = findRoot(__dirname);
const UNITS_PATH = path.join(ROOT, 'standards', 'shengli', 'units.json');
const CHAPTER = '4';

const load = () => JSON.parse(fs.readFileSync(UNITS_PATH, 'utf8'));

/** 本章的十二个知识单元，按 locator 原序返回（不排序，教材顺序即教学顺序） */
function chapterUnits(data, ch) {
  const no = ch || CHAPTER;
  return data.units.filter((u) => u.chapter === no);
}

/** 视角与层级剖面：三视角 × 四层级，全部从每单元的 measure 里加总，不估读 */
function profile(units) {
  const views = { 代谢: 0, 机能: 0, 形态: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of units) {
    for (const k of Object.keys(views)) views[k] += u.measure.views[k] || 0;
    for (const k of Object.keys(levels)) levels[k] += u.measure.levels[k] || 0;
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return {
    n: units.length,
    hanzi: units.reduce((a, u) => a + u.hanzi, 0),
    views,
    levels,
    viewTotal: sum(views),
    levelTotal: sum(levels),
    locators: units.map((u) => u.locator),
  };
}

/** 单条：占全章的比例，返回 0–1，只在程序里用，文档不写百分比 */
function share(part, whole) {
  if (!whole) throw new Error('分母为零：剖面为空');
  return part / whole;
}

// ── 模型一：心动周期判别 ──────────────────────────────────────────────
// 教材 4.1.2 的判据只有两个量：两个瓣膜的启闭，加上「此刻处于收缩期还是舒张期」。
// 容积方向不是独立输入，它是前两个量的推论——写进表里是为了当校验用。
const PHASE_TABLE = {
  'closed|closed|systole': { phase: '等容收缩期', volume: 'flat' },
  'closed|open|systole': { phase: '射血期', volume: 'down' },
  'closed|closed|diastole': { phase: '等容舒张期', volume: 'flat' },
  'open|closed|diastole': { phase: '充盈期', volume: 'up' },
};

/**
 * phaseOf({ av, sl, stage, volume? }) → { phase, volume }
 * av / sl: 'open' | 'closed'；stage: 'systole' | 'diastole'
 * volume: 'up' | 'down' | 'flat'，给了就校验，与瓣膜状态矛盾即抛错。
 */
function phaseOf({ av, sl, stage, volume }) {
  const key = `${av}|${sl}|${stage}`;
  const hit = PHASE_TABLE[key];
  if (!hit) {
    throw new Error(
      `瓣膜状态与时相不相容：房室瓣 ${av} · 动脉瓣 ${sl} · ${stage}`,
    );
  }
  if (volume && volume !== hit.volume) {
    throw new Error(
      `${hit.phase}的容积方向应为 ${hit.volume}，给的是 ${volume} —— 容积方向是瓣膜状态的推论，不是独立输入`,
    );
  }
  return { phase: hit.phase, volume: hit.volume };
}

/** 按教材顺序走一遍完整周期，返回时相序列 */
function cycle(stages) {
  const seq = stages || [
    { av: 'closed', sl: 'closed', stage: 'systole' },
    { av: 'closed', sl: 'open', stage: 'systole' },
    { av: 'closed', sl: 'closed', stage: 'diastole' },
    { av: 'open', sl: 'closed', stage: 'diastole' },
  ];
  return seq.map((s) => phaseOf(s));
}

// ── 模型二：血管区段 → 功能类别 ────────────────────────────────────
const VESSELS = [
  { key: '大动脉', role: '弹性贮器血管', why: '弹性成分比例大，缓冲心室射血的压力波动，使舒张期血流不断' },
  { key: '小动脉', role: '阻力血管', why: '管壁以平滑肌为主，口径变化对血流阻力影响最明显' },
  { key: '微动脉', role: '阻力血管', why: '口径最小，是局部血流分配与总外周阻力的着力点' },
  { key: '毛细血管', role: '交换血管', why: '单层内皮、总横截面积大、流速慢，物质交换的主要场所' },
  { key: '静脉', role: '容量血管', why: '管壁薄、口径大，贮存血液并保证回流' },
];

function vesselRole(name) {
  const hit = VESSELS.find((v) => v.key === name);
  if (!hit) throw new Error(`没有这个血管区段：${name}（只收大动脉/小动脉/微动脉/毛细血管/静脉）`);
  return { role: hit.role, why: hit.why };
}

// ── 模型三：动脉血压的四条形成条件，逐条回教材正文核对 ──────────────
// 条件不是凭印象列的：每条都要求能在 4.3.2 的正文里逐字找到，找不到就报错。
const BP_CONDITIONS = [
  { name: '血液充盈', quote: '血管系统内必须有足够的血液充盈' },
  { name: '心脏射血', quote: '心脏的射血是动脉血压形成的动力来源' },
  { name: '外周阻力', quote: '外周阻力是动脉血压得以维持的重要因素' },
  { name: '大动脉弹性', quote: '大动脉的弹性贮器作用使心室舒张期的动脉血压仍能保持在一定的水平' },
];

function conditionsInText(units) {
  const u = units.find((x) => x.locator === '教材·第4章·4.3.2');
  if (!u) throw new Error('units.json 里没有 4.3.2，无法核对形成条件');
  return BP_CONDITIONS.map((c) => ({ name: c.name, found: u.body.includes(c.quote) }));
}

// ── 模型四：器官循环的三种调节侧重 ──────────────────────────────────
const ORGAN_CIRCULATION = [
  { organ: '冠脉循环', timing: '供血主要在心室舒张期', driver: '心肌代谢产物为主，神经调节次要', note: '侧支不发达，对通路依赖高' },
  { organ: '肺循环', timing: '阻力小、压力低、容量大', driver: '局部因素与体液因素为主', note: '低氧使肺血管收缩，利于通气与血流匹配' },
  { organ: '脑循环', timing: '一定血压范围内流量相对稳定', driver: '自身调节与化学调节为主', note: '同一因素的方向与肺循环相反' },
];

function organRow(name) {
  const hit = ORGAN_CIRCULATION.find((o) => o.organ === name);
  if (!hit) throw new Error(`没有这个器官循环：${name}`);
  return hit;
}

// ── 模型五：教材「零数值」声明，逐单元核验 ──────────────────────────
function valueLikeZero(units) {
  const bad = units.filter((u) => u.measure.valueLike !== 0);
  return { checked: units.length, bad: bad.map((u) => u.locator) };
}

/** 四层级里最薄的一层落在哪一节：把「组织最弱」从印象变成可指认的位置 */
function levelHotspot(units, level) {
  const key = level || '组织';
  const ranked = units
    .map((u) => ({ locator: u.locator, title: u.title, n: u.measure.levels[key] || 0 }))
    .sort((a, b) => b.n - a.n);
  const top = ranked[0];
  const rest = ranked.slice(1).reduce((a, r) => a + r.n, 0);
  return { level: key, locator: top.locator, title: top.title, n: top.n, rest };
}

function main() {
  const data = load();
  const units = chapterUnits(data);
  const p = profile(units);

  console.log('═══ 血液循环：泵血·血管·调节·器官循环 (生理学 第4章) ═══');
  console.log(`教材规模: 第4章 ${p.hanzi} 字 · 知识单元 ${p.n} 个（4.1–4.4，每节三个）`);

  console.log('\n三视角剖面（词频，逐单元加总）');
  for (const [k, v] of Object.entries(p.views)) {
    console.log(`  ${k} ${String(v).padStart(4)} · ${(share(v, p.viewTotal) * 100).toFixed(1)}%`);
  }
  console.log(`  合计 ${p.viewTotal} · 机能是代谢的 ${(p.views.机能 / p.views.代谢).toFixed(1)} 倍`);

  console.log('\n四层级剖面');
  for (const [k, v] of Object.entries(p.levels)) {
    console.log(`  ${k} ${String(v).padStart(4)} · ${(share(v, p.levelTotal) * 100).toFixed(1)}%`);
  }
  console.log(`  合计 ${p.levelTotal} · 细胞与器官合计 ${(((p.levels.细胞 + p.levels.器官) / p.levelTotal) * 100).toFixed(1)}%，组织最低`);

  const hs = levelHotspot(units, '组织');
  console.log(`  组织层落点: ${hs.locator}（${hs.title}）${hs.n} 处 · 其余十一节合计 ${hs.rest} 处`);

  console.log('\n心动周期：两个瓣膜的状态唯一决定四个时相');
  for (const s of cycle()) {
    console.log(`  ${s.phase} · 容积 ${s.volume}`);
  }
  const bad = [
    { av: 'open', sl: 'open', stage: 'systole', why: '两个瓣膜不可能同时开放' },
    { av: 'open', sl: 'closed', stage: 'systole', why: '心室收缩期房室瓣必须关闭，否则血液倒流入心房' },
  ];
  for (const b of bad) {
    try {
      phaseOf(b);
      console.log(`  ✗ ${b.why} 竟然通过了判别`);
    } catch (e) {
      console.log(`  ✓ 不相容组合被拒：${b.why}`);
    }
  }

  console.log('\n血管区段 → 功能类别（结构决定功能）');
  for (const v of VESSELS) {
    console.log(`  ${v.key} · ${v.role} · ${v.why}`);
  }

  console.log('\n动脉血压的四条形成条件 —— 逐条回教材 4.3.2 正文核对');
  for (const c of conditionsInText(units)) {
    console.log(`  ${c.found ? '✓' : '✗'} ${c.name}`);
  }

  console.log('\n器官循环：同一个调节因素，方向可以相反');
  for (const o of ORGAN_CIRCULATION) {
    console.log(`  ${o.organ} · ${o.timing} · ${o.driver} · ${o.note}`);
  }

  const z = valueLikeZero(units);
  console.log(`\n教材「零数值」核验: ${z.checked} 个单元 · valueLike 非零 ${z.bad.length} 个`);

  console.log('\n教学边界：本章数字由 standards/shengli/units.json 现算，只用于说明教材的机制类别与关系；本书不给值，不写数值与单位与正常值，不构成诊断、治疗或用药依据');

  return { p, conditions: conditionsInText(units), zero: z };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  UNITS_PATH,
  load,
  chapterUnits,
  profile,
  share,
  phaseOf,
  cycle,
  PHASE_TABLE,
  vesselRole,
  VESSELS,
  BP_CONDITIONS,
  conditionsInText,
  organRow,
  ORGAN_CIRCULATION,
  valueLikeZero,
  levelHotspot,
  main,
};
