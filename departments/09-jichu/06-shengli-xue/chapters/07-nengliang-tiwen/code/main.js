#!/usr/bin/env node
/**
 * 生理学 · 第 7 章 能量代谢与体温
 * 课程: departments/09-jichu/06-shengli-xue/chapters/07-nengliang-tiwen/docs/zh.md
 * 出处: 教材·第7章·7.1–7.4（能量代谢的测定与影响因素、体温及其变动、产热与散热、体温调节、观察与记录口径）
 * 数据: standards/shengli/units.json（132 个知识单元，每单元带 hanzi 与 measure 的数值核验与三视角/四层级词频）
 *
 * 为什么全部现算而不手打：
 * 本章要立的命题有两个————————
 *   ① 本章是全书写「代谢」写得最重的一章（不是机能章）；
 *   ② 本章一个数值都没有（measure.valueLike 逐单元核验，合计为 0）。
 * 命题②如果靠手打，就变成「作者说他没写数」；靠现算，就变成「程序去数了，数出来是 0」。
 * 教学里最贵的不是结论，是能对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CH = '7';
const VIEWS = ['代谢', '机能', '形态'];
const LEVELS = ['细胞', '组织', '器官', '系统'];

// 契约路径（相对 code/）: ../../../../standards/shengli/units.json
// 该层数依赖章节目录深度；层数一变就 ENOENT，所以先试契约路径，再向上找带 standards/shengli 的那一级。
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

/** 节号去重：本章 12 个小节落在 4 个节里 */
function sectionsOf(units) {
  return [...new Set(units.map((u) => u.sec))];
}

/** 三视角 × 四层级 的合计 + 数值核验合计。全部来自 measure，不另设词表。 */
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

/** 单元的主视角：三视角里命中最多的一项；全为 0 时返回 '未标注'（不猜） */
function dominantView(unit) {
  let best = '未标注';
  let max = 0;
  for (const k of VIEWS) {
    const n = unit.measure.views[k] || 0;
    if (n > max) { max = n; best = k; }
  }
  return best;
}

/** 主层级：四层级里命中最多的一项 */
function dominantLevel(unit) {
  let best = '未标注';
  let max = 0;
  for (const k of LEVELS) {
    const n = unit.measure.levels[k] || 0;
    if (n > max) { max = n; best = k; }
  }
  return best;
}

/**
 * 热量收支的净方向：只回答「哪一侧变了」，不回答变了多少。
 * production / loss 取 '升' | '降' | '平'。
 * 两侧同向变动时，净方向取决于幅度——本章不给幅度，所以这里明确返回「推不出」，
 * 而不是拿一个符号硬算。这一处是本程序最想教的东西：类别推理有它推不出的问题。
 */
function netHeatDirection(production, loss) {
  const d = { 升: 1, 降: -1, 平: 0 };
  if (!(production in d) || !(loss in d)) throw new Error(`方向只取「升」「降」「平」，收到 ${production}/${loss}`);
  if (d[production] === 0 && d[loss] === 0) return '净持平';
  if (d[production] > 0 && d[loss] < 0) return '净增（产热升、散热降）';
  if (d[production] < 0 && d[loss] > 0) return '净减（产热降、散热升）';
  return '净方向取决于两侧的幅度，类别推不出（本书不给幅度）';
}

/** 散热方式的侧重：随环境条件的类别而变，顺序本身就表达「谁在打主力」 */
function lossModesByEnv(env) {
  if (env === '冷') return ['辐射', '传导', '对流', '蒸发（以不感蒸发为主）'];
  if (env === '热') return ['蒸发（以发汗为主）', '对流', '传导', '辐射'];
  throw new Error(`环境类别只取「冷」或「热」，收到 ${env}`);
}

/** 产热来源的类别：安静以内脏为主，活动以骨骼肌为主 */
function heatSourceByState(state) {
  if (state === '安静') return { 主: '内脏器官（肝的代谢水平较高）', 次: '脑与心脏等持续产热', 形式: '非寒战产热为主' };
  if (state === '活动') return { 主: '骨骼肌', 次: '内脏器官', 形式: '肌肉收缩作功转为热量' };
  if (state === '寒冷') return { 主: '骨骼肌（寒战）', 次: '非寒战产热（代谢增强）', 形式: '寒战产热 + 非寒战产热' };
  throw new Error(`状态类别只取「安静」「活动」「寒冷」，收到 ${state}`);
}

/** 一节的机制性 vs 口径性：本章 7.3 与 7.4 是观察与表述口径，不是机制 */
function unitKind(unit) {
  return /^7\.[34]\./.test(unit.sub) ? '口径' : '机制';
}

function main() {
  const db = load();
  const units = chapterUnits(db);
  const meta = chapterMeta(db);
  const secs = sectionsOf(units);
  const agg = aggregate(units);

  console.log('═══ 能量代谢与体温 (生理学 第7章) ═══');
  console.log(`教材规模: ${meta.title.replace(/^第\d+章\s*/, '')} · ${agg.hanzi} 字 · ${agg.units} 个知识单元 · ${secs.length} 个节`);

  console.log(`\n数值核验: 12 个单元 measure.valueLike 合计 ${agg.valueLike} —— ${agg.valueLike === 0 ? '本章不给值（不是漏写，是核过的）' : '出现数值，需复核'}`);

  console.log('\n三视角（本章合计）');
  for (const k of VIEWS) console.log(`  ${k} ${String(agg.views[k]).padStart(4)}`);

  console.log('\n四层级（本章合计）');
  for (const k of LEVELS) console.log(`  ${k} ${String(agg.levels[k]).padStart(4)}`);

  console.log('\n单元层：小节 · 主视角 · 主层级 · 类别（机制/口径）');
  for (const u of units) {
    const v = VIEWS.map((k) => `${u.measure.views[k]}`).join('/');
    console.log(`  ${u.sub} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '').padEnd(22, '　')} ${dominantView(u)} · ${dominantLevel(u)} · ${unitKind(u)} · 视角 ${v}`);
  }

  console.log('\n关系链（本章唯一的「因果骨架」，全部是类别与方向）');
  console.log('  能源物质 ─氧化分解→ 热量 + 作功');
  console.log('  产热（内脏 / 骨骼肌 · 寒战 / 非寒战）─┐');
  console.log('  散热（皮肤 · 辐射/传导/对流/蒸发）  ─┴→ 体温的方向');
  console.log('  调节（皮肤血管 · 汗腺 · 骨骼肌 · 行为）→ 改写上面两侧的强弱');
  console.log('  调定参照 ─偏离→ 效应按偏离方向修正 → 回到参照附近');

  console.log('\n三类情境的推演（只推方向，不推幅度）');
  for (const [state, prod, loss] of [['安静', '平', '平'], ['活动', '升', '升'], ['寒冷', '升', '降']]) {
    const src = heatSourceByState(state);
    console.log(`  ${state}: 产热 ${prod} / 散热 ${loss} → ${netHeatDirection(prod, loss)} · 产热主力 ${src.主}`);
  }
  console.log('  注意「活动」一行: 产与散同时升，净方向推不出——这正是「不给值」的代价，也是本章要教的推理边界');
  console.log('  「寒冷」一行的净增不是结论而是入口: 调节把净增用于回补此前散失的热量，体温表现为回到参照附近，而不是持续升高');

  const cold = lossModesByEnv('冷');
  const hot = lossModesByEnv('热');
  console.log(`  散热方式的侧重: 冷 ${cold[0]} → 热 ${hot[0]}（顺序即主力，不给占比）`);

  const kinds = units.reduce((m, u) => { m[unitKind(u)] = (m[unitKind(u)] || 0) + 1; return m; }, {});
  console.log(`\n结构读出: 机制 ${kinds['机制']} 个单元 / 口径 ${kinds['口径']} 个单元 —— 不能给值，就只能把「怎么观察、怎么记录」写足`);

  console.log('\n教学边界：本章只写产热与散热的类别与关系与变化方向，不给任何数值与单位与参考值；观察与记录口径只用于教学训练，不构成诊断、治疗或健康判定依据');

  return { agg, secs, units };
}

if (require.main === module) {
  main();
}

module.exports = {
  CH, VIEWS, LEVELS, UNITS_FILE,
  load, chapterUnits, chapterMeta, sectionsOf, aggregate,
  dominantView, dominantLevel, netHeatDirection,
  lossModesByEnv, heatSourceByState, unitKind, main,
};
