#!/usr/bin/env node
/**
 * 生理学 · 第 8 章 肾脏的排泄功能
 * 课程: departments/09-jichu/06-shengli-xue/chapters/08-shenzang-paixie/docs/zh.md
 * 出处: 教材·第8章·8.1–8.4（肾脏血流、滤过、重吸收与分泌、浓缩与稀释、尿生成调节、清除率与排尿）
 * 数据: standards/shengli/units.json
 *
 * 本章的程序不计算滤过率，也不计算清除率——因为教材不给值。
 * 它做的是另一件事：把「三环节的转运方向」「滤过动力的两侧」「浓缩的两个条件」
 * 写成可枚举的类别表，让每一次「尿量变了」都能落到「哪一环、朝哪边」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CH = '8';
const VIEWS = ['代谢', '机能', '形态'];
const LEVELS = ['细胞', '组织', '器官', '系统'];

// 契约路径（相对 code/）: ../../../../standards/shengli/units.json；层数一变就 ENOENT，故留兜底向上找。
function findUnitsFile(start) {
  const literal = path.resolve(start, '..', '..', '..', '..', 'standards', 'shengli', 'units.json');
  if (fs.existsSync(literal)) return literal;
  let dir = start;
  for (let i = 0; i < 10; i += 1) {
    const p = path.join(dir, 'standards', 'shengli', 'units.json');
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/shengli/units.json —— 章节目录是否已脱离仓库？');
}

const UNITS_FILE = findUnitsFile(__dirname);

function load() {
  return JSON.parse(fs.readFileSync(UNITS_FILE, 'utf8'));
}

function chapterUnits(db, ch = CH) {
  const arr = db.units.filter((u) => u.chapter === ch);
  if (!arr.length) throw new Error(`units.json 里没有第${ch}章`);
  return arr;
}

function chapterMeta(db, ch = CH) {
  const m = db.chapters.find((c) => c.no === ch);
  if (!m) throw new Error(`units.json 的 chapters 里没有第${ch}章`);
  return m;
}

function sectionsOf(units) {
  return [...new Set(units.map((u) => u.sec))];
}

function aggregate(units) {
  const views = Object.fromEntries(VIEWS.map((k) => [k, 0]));
  const levels = Object.fromEntries(LEVELS.map((k) => [k, 0]));
  let valueLike = 0;
  let hanzi = 0;
  for (const u of units) {
    hanzi += u.hanzi || 0;
    valueLike += u.measure.valueLike || 0;
    for (const k of VIEWS) views[k] += u.measure.views[k] || 0;
    for (const k of LEVELS) levels[k] += u.measure.levels[k] || 0;
  }
  return { views, levels, valueLike, hanzi, units: units.length };
}

/** 三环节的转运方向——本章全部推论的起点，方向反了后面全反 */
function transportDirection(stage) {
  const table = {
    滤过: '血液 → 肾小囊（血浆被初步处理）',
    重吸收: '小管液 → 血液（把有用物质收回）',
    分泌: '血液或上皮细胞 → 小管液（把物质排出去）',
    排泄: '滤过 + 分泌 两条路径的总和（重吸收不计入）',
  };
  if (!(stage in table)) throw new Error(`环节只取 滤过/重吸收/分泌/排泄，收到 ${stage}`);
  return table[stage];
}

/** 滤过动力的两侧：推动一项，对抗两项。漏掉任何一项，方向都会算错。 */
function filtrationForces() {
  return {
    推动: ['肾小球毛细血管血压'],
    对抗: ['血浆胶体渗透压', '肾小囊内压'],
    合成: '有效滤过压 = 推动 − 对抗（两项之和），方向决定滤过能否进行',
  };
}

/**
 * 有效滤过压变了多少：只给方向，不给值。
 * push / oppose 取 '升' | '降' | '平'。
 * 两侧同向变动时幅度未知 → 明确返回「推不出」，不硬算。
 */
function filtrationShift(push, oppose) {
  const d = { 升: 1, 降: -1, 平: 0 };
  if (!(push in d) || !(oppose in d)) throw new Error(`方向只取「升」「降」「平」，收到 ${push}/${oppose}`);
  const up = '有效滤过压升高（滤过增强）';
  const down = '有效滤过压降低（滤过减弱）';
  if (push === '平' && oppose === '平') return '有效滤过压不变';
  // 恰好一侧变动：方向可以定
  if (oppose === '平') return push === '升' ? up : down;
  if (push === '平') return oppose === '升' ? down : up; // 对抗力升高 = 有效滤过压降低
  // 两侧同时变动：方向相反可定，方向相同则幅度未知
  if (push === '升' && oppose === '降') return up;
  if (push === '降' && oppose === '升') return down;
  return '净方向取决于两侧幅度，类别推不出（本书不给幅度）';
}

/**
 * 尿液浓缩与稀释：两个条件缺一不可。
 * 梯度 = 髓质渗透梯度是否建立；adh = 抗利尿激素是否使集合管对水通透。
 */
function urineConcentration(gradient, adh) {
  if (!['有', '无'].includes(gradient) || !['有', '无'].includes(adh)) {
    throw new Error(`梯度与激素只取「有」「无」，收到 ${gradient}/${adh}`);
  }
  if (gradient === '有' && adh === '有') return '浓缩（水被重吸收，尿量相对减少）';
  if (gradient === '有' && adh === '无') return '稀释（梯度在但水不通透，尿量相对增多）';
  if (gradient === '无' && adh === '有') return '浓缩不成立（缺渗透压差这个条件）';
  return '稀释（两个条件都不在，水不被重吸收）';
}

/** 清除率的含义随物质在肾内的转运方式而变——不是三个公式，是三种「读法」 */
function clearanceMeaning(category) {
  const table = {
    只滤过: '可反映肾小球滤过过程的水平类别',
    滤过并分泌: '可反映肾血浆流量的水平类别',
    滤过并重吸收: '需结合该物质的重吸收程度加以说明',
  };
  if (!(category in table)) throw new Error(`物质类别只取 只滤过/滤过并分泌/滤过并重吸收，收到 ${category}`);
  return table[category];
}

/** 主视角 / 主层级：命中最多者；全 0 返回「未标注」，不猜 */
function dominantOf(measureMap, keys) {
  let best = '未标注';
  let max = 0;
  for (const k of keys) {
    const n = measureMap[k] || 0;
    if (n > max) { max = n; best = k; }
  }
  return best;
}
const dominantView = (unit) => dominantOf(unit.measure.views, VIEWS);
const dominantLevel = (unit) => dominantOf(unit.measure.levels, LEVELS);

function main() {
  const db = load();
  const units = chapterUnits(db);
  const meta = chapterMeta(db);
  const secs = sectionsOf(units);
  const agg = aggregate(units);

  console.log('═══ 肾脏的排泄功能 (生理学 第8章) ═══');
  console.log(`教材规模: ${meta.title.replace(/^第\d+章\s*/, '')} · ${agg.hanzi} 字 · ${agg.units} 个知识单元 · ${secs.length} 个节`);

  console.log(`\n数值核验: 12 个单元 measure.valueLike 合计 ${agg.valueLike} —— ${agg.valueLike === 0 ? '本章不给值（不是漏写，是核过的）' : '出现数值，需复核'}`);

  console.log('\n三视角（本章合计）');
  for (const k of VIEWS) console.log(`  ${k} ${String(agg.views[k]).padStart(4)}`);

  console.log('\n四层级（本章合计）');
  for (const k of LEVELS) console.log(`  ${k} ${String(agg.levels[k]).padStart(4)}`);

  console.log('\n单元层：小节 · 主视角 · 主层级');
  for (const u of units) {
    console.log(`  ${u.sub} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '').padEnd(24, '　')} ${dominantView(u)} · ${dominantLevel(u)}`);
  }

  console.log('\n三环节的转运方向（本章全部推论的起点）');
  for (const s of ['滤过', '重吸收', '分泌', '排泄']) console.log(`  ${s}: ${transportDirection(s)}`);

  const f = filtrationForces();
  console.log('\n滤过动力的两侧');
  console.log(`  推动: ${f.推动.join(' + ')}`);
  console.log(`  对抗: ${f.对抗.join(' + ')}`);
  console.log(`  ${f.合成}`);

  console.log('\n滤过动力的三种变动（只推方向）');
  for (const [name, push, oppose] of [
    ['入球小动脉收缩、毛细血管血压降', '降', '平'],
    ['血浆蛋白减少、胶体渗透压降', '平', '降'],
    ['尿路受阻、肾小囊内压升', '平', '升'],
  ]) {
    console.log(`  ${name} → ${filtrationShift(push, oppose)}`);
  }
  console.log(`  两侧同向变动（如血压降而胶体渗透压也降） → ${filtrationShift('降', '降')}`);

  console.log('\n浓缩与稀释：两个条件缺一不可');
  for (const [g, a] of [['有', '有'], ['有', '无'], ['无', '有'], ['无', '无']]) {
    console.log(`  髓质梯度 ${g} · 抗利尿激素 ${a} → ${urineConcentration(g, a)}`);
  }

  console.log('\n清除率：不是三个公式，是三种读法');
  for (const c of ['只滤过', '滤过并分泌', '滤过并重吸收']) {
    console.log(`  ${c} → ${clearanceMeaning(c)}`);
  }

  console.log(`\n结构读出: 器官 ${agg.levels['器官']} 与形态 ${agg.views['形态']} 偏高 —— 本章先讲结构（两套毛细血管、滤过膜三层），再讲功能`);
  console.log('  这也是「不给值」的代价: 既然不能靠数字说明强弱，就只能把「方向与条件」写得足够密');

  console.log('\n教学边界：本章只写滤过与重吸收与分泌与浓缩的类别与关系与变化方向，不给任何数值与单位与参考值；不构成诊断、治疗或健康判定依据');

  return { agg, secs, units };
}

if (require.main === module) {
  main();
}

module.exports = {
  CH, VIEWS, LEVELS, UNITS_FILE,
  load, chapterUnits, chapterMeta, sectionsOf, aggregate,
  transportDirection, filtrationForces, filtrationShift,
  urineConcentration, clearanceMeaning, dominantOf, dominantView, dominantLevel, main,
};
