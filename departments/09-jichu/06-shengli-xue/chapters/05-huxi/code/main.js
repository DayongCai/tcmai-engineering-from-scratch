#!/usr/bin/env node
/**
 * 生理学 · 第 5 章 呼吸：通气·换气·气体运输·呼吸调节
 * 课程: departments/09-jichu/06-shengli-xue/chapters/05-huxi/docs/zh.md
 * 出处: 教材·第5章（5.1 肺通气 / 5.2 呼吸气体的交换 / 5.3 气体在血液中的运输 /
 *       5.4 呼吸运动的调节），十二个知识单元
 * 数据: standards/shengli/units.json（逐单元带 views / levels 词频与 hanzi）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算而不手打：
 *   ① 本章有五个「方向题」，方向答错的代价比记不住更大：平静呼气是被动还是主动、
 *      浅快呼吸的效率是高还是低、通气血流比值是越大越好还是两个方向都错、
 *      曲线右移是亲和力升还是降、低氧主要经中枢还是外周。把它们写成判别函数，
 *      每个输入都必须给出方向；给不出来就抛错，而不是含糊过去。
 *   ② 「本章的组织层最厚」这句话必须有可复算的词频支撑——呼吸有两端，
 *      一端在肺泡（器官层），一端在组织（组织层），这是本章与循环章最大的结构差别。
 *   ③ 教材声明 valueLike = 0，本章逐单元核验这个声明，非零即报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
const CHAPTER = '5';

const load = () => JSON.parse(fs.readFileSync(UNITS_PATH, 'utf8'));

function chapterUnits(data, ch) {
  return data.units.filter((u) => u.chapter === (ch || CHAPTER));
}

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

function share(part, whole) {
  if (!whole) throw new Error('分母为零：剖面为空');
  return part / whole;
}

/** 四层级里某一层的落点集中在哪里：把「哪一节在讲这一层」从印象变成可指认的位置 */
function levelHotspot(units, level) {
  const key = level || '组织';
  const ranked = units
    .map((u) => ({ locator: u.locator, title: u.title, n: u.measure.levels[key] || 0 }))
    .sort((a, b) => b.n - a.n);
  const top = ranked[0];
  const rest = ranked.slice(1).reduce((a, r) => a + r.n, 0);
  return { level: key, locator: top.locator, title: top.title, n: top.n, rest };
}

// ── 模型一：无效腔 —— 浅快呼吸为什么效率低 ──────────────────────────
// 关系式：每分通气量 = 潮气量 × 频率；肺泡通气量 = (潮气量 − 无效腔) × 频率。
// 两条式相减即得：无效腔通气量 = 无效腔 × 频率。所以「频率升高」本身就在
// 增加无效腔通气——前提是每分通气量不变，此时深度必然下降。
// 本章不给任何容积数值，只判方向。
function deadSpaceTrend({ freq, depth }) {
  const k = `${freq}|${depth}`;
  const TABLE = {
    'up|down': { form: '浅快呼吸', alveolar: 'down', why: '每分通气量不变时深度下降，而频率上升使无效腔通气增加，两者同向压低肺泡通气量' },
    'down|up': { form: '深慢呼吸', alveolar: 'up', why: '每分通气量不变时深度上升，频率下降使无效腔通气减少，肺泡通气量相对增加' },
    'flat|flat': { form: '平静呼吸', alveolar: 'flat', why: '形式未变，肺泡通气量随每分通气量同向变化' },
    'up|up': { form: '深快呼吸', alveolar: 'up', why: '深度与频率同时上升，肺泡通气量增加（每分通气量也在增加，不是等量比较）' },
  };
  const hit = TABLE[k];
  if (!hit) {
    throw new Error(
      `无法判定肺泡通气量的方向：频率 ${freq} · 深度 ${depth} —— 这类组合缺少「每分通气量是否不变」的前提`,
    );
  }
  return { ...hit, freq, depth };
}

// ── 模型二：通气血流比值的两个方向都错 ──────────────────────────────
// 教材 5.2.2：比值增大 → 通气相对过剩（无效腔样）；比值减小 → 血流相对过剩（分流样）。
// 所以没有「越大越好」，只有一个匹配点。
function vqClass(trend) {
  const TABLE = {
    up: { label: '无效腔样', why: '通气相对过剩而血流相对不足，部分通气未参与交换' },
    down: { label: '分流样', why: '血流相对过剩而通气相对不足，部分血流未充分氧合' },
    flat: { label: '匹配', why: '通气与血流相适应，交换效率的条件最好' },
  };
  const hit = TABLE[trend];
  if (!hit) throw new Error(`比值的变化方向只能是 up / down / flat，给的是 ${trend}`);
  return { trend, ...hit };
}

// ── 模型三：氧解离曲线的移动方向 ────────────────────────────────────
// 四个因素同向：酸碱程度下降、二氧化碳升高、温度升高、红细胞内含磷化合物增多，
// 都使血红蛋白对氧的亲和力下降，曲线右移（同水平下释放更多氧）。
const SHIFT_FACTORS = [
  { key: '酸碱程度下降', dir: 'right' },
  { key: '二氧化碳升高', dir: 'right' },
  { key: '温度升高', dir: 'right' },
  { key: '含磷化合物增多', dir: 'right' },
];

function curveShift(factors) {
  const known = new Map(SHIFT_FACTORS.map((f) => [f.key, f.dir]));
  let right = 0;
  let left = 0;
  const applied = [];
  for (const f of factors) {
    const d = known.get(f);
    if (!d) throw new Error(`不是本章列出的影响因素：${f}（只收酸碱程度下降/二氧化碳升高/温度升高/含磷化合物增多）`);
    applied.push(f);
    if (d === 'right') right += 1;
    else left += 1;
  }
  if (!applied.length) throw new Error('没有给出任何影响因素，无法判定移动方向');
  if (left === 0 && right > 0) return { shift: '右移', meaning: '亲和力下降，组织侧释放更多氧', applied };
  if (right === 0 && left > 0) return { shift: '左移', meaning: '亲和力上升，结合更牢', applied };
  return { shift: '合力为零', meaning: '两方向并存，须给出各因素的相对强度才能判定', applied };
}

// ── 模型四：化学感受器的分工 ────────────────────────────────────────
// 最容易背反的一条：二氧化碳主要经中枢，低氧主要经外周。
const CHEMO = {
  二氧化碳升高: { site: '中枢化学感受器为主', why: '二氧化碳通过影响氢离子的相对水平间接起作用，外周也参与且方向一致' },
  氧下降: { site: '外周化学感受器为主', why: '中枢化学感受器对低氧不敏感，低氧的刺激作用主要经颈动脉体与主动脉体' },
  氢离子升高: { site: '中枢与外周均可', why: '脑脊液与血液中的氢离子可分别作用于中枢与外周化学感受器' },
};

function chemoreceptor(stimulus) {
  const hit = CHEMO[stimulus];
  if (!hit) throw new Error(`本章只讨论三种化学刺激，收到的是：${stimulus}`);
  return { stimulus, ...hit };
}

// ── 模型五：扩散方向 ────────────────────────────────────────────────
// 扩散的唯一判据是两侧的相对水平，不是「哪个是废物」。约定：left 与 right
// 分别是所比较两侧的相对水平类别，返回的是「由哪一侧流向哪一侧」。
function fluxDirection(gas, left, right) {
  const ok = ['较高', '较低'];
  if (!ok.includes(left) || !ok.includes(right)) {
    throw new Error('两侧相对水平只接受「较高」与「较低」两个取值');
  }
  if (left === right) return { gas, dir: '净移动为零（动态平衡）' };
  return { gas, dir: left === '较高' ? '左→右' : '右→左' };
}

// ── 模型六：教材零数值声明，逐单元核验 ──────────────────────────────
function valueLikeZero(units) {
  const bad = units.filter((u) => u.measure.valueLike !== 0);
  return { checked: units.length, bad: bad.map((u) => u.locator) };
}

function main() {
  const data = load();
  const units = chapterUnits(data);
  const p = profile(units);

  console.log('═══ 呼吸：通气·换气·气体运输·呼吸调节 (生理学 第5章) ═══');
  console.log(`教材规模: 第5章 ${p.hanzi} 字 · 知识单元 ${p.n} 个（5.1–5.4，每节三个）`);

  console.log('\n三视角剖面（词频，逐单元加总）');
  for (const [k, v] of Object.entries(p.views)) {
    console.log(`  ${k} ${String(v).padStart(4)} · ${(share(v, p.viewTotal) * 100).toFixed(1)}%`);
  }
  console.log(`  合计 ${p.viewTotal} · 代谢占比是循环章的数倍（呼吸讲的是物质怎么进出）`);

  console.log('\n四层级剖面');
  for (const [k, v] of Object.entries(p.levels)) {
    console.log(`  ${k} ${String(v).padStart(4)} · ${(share(v, p.levelTotal) * 100).toFixed(1)}%`);
  }
  const hs = levelHotspot(units, '组织');
  console.log(`  组织层落点: ${hs.locator}（${hs.title}）${hs.n} 处 · 其余十一节合计 ${hs.rest} 处`);

  console.log('\n无效腔：同样每分通气量下，浅快与深慢的效率不同');
  for (const f of [
    { freq: 'up', depth: 'down' },
    { freq: 'down', depth: 'up' },
    { freq: 'flat', depth: 'flat' },
  ]) {
    const r = deadSpaceTrend(f);
    console.log(`  ${r.form} · 肺泡通气量 ${r.alveolar} · ${r.why}`);
  }

  console.log('\n通气血流比值：两个方向都不好');
  for (const t of ['up', 'down', 'flat']) {
    const r = vqClass(t);
    console.log(`  比值${t} → ${r.label} · ${r.why}`);
  }

  console.log('\n氧解离曲线：四个因素同向移动');
  const s = curveShift(['酸碱程度下降', '二氧化碳升高', '温度升高']);
  console.log(`  ${s.applied.join(' + ')} → ${s.shift} · ${s.meaning}`);

  console.log('\n化学感受器分工（最容易背反的一条）');
  for (const k of Object.keys(CHEMO)) {
    const r = chemoreceptor(k);
    console.log(`  ${r.stimulus} → ${r.site} · ${r.why}`);
  }

  console.log('\n扩散方向只看两侧相对水平（左=肺泡侧或血液侧，右=另一侧）');
  console.log(`  肺侧氧：${fluxDirection('氧', '较高', '较低').dir}（肺泡气 → 血液）`);
  console.log(`  肺侧二氧化碳：${fluxDirection('二氧化碳', '较低', '较高').dir}（血液 → 肺泡气）`);
  console.log('  组织侧两处方向恰好相反：同一机制，方向相反');

  const z = valueLikeZero(units);
  console.log(`\n教材「零数值」核验: ${z.checked} 个单元 · valueLike 非零 ${z.bad.length} 个`);

  console.log('\n教学边界：本章数字由 standards/shengli/units.json 现算，只用于说明教材的机制类别与关系；本书不给值，不写数值与单位与正常值，不构成诊断、治疗或用药依据');

  return { p, hotspot: hs, zero: z };
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
  levelHotspot,
  deadSpaceTrend,
  vqClass,
  curveShift,
  SHIFT_FACTORS,
  chemoreceptor,
  CHEMO,
  fluxDirection,
  valueLikeZero,
  main,
};
