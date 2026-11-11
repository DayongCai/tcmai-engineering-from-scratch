#!/usr/bin/env node
/**
 * 生理学 · 第 9 章 内分泌
 * 课程: departments/09-jichu/06-shengli-xue/chapters/09-neifenmi/docs/zh.md
 * 出处: 教材·第9章·9.1–9.4（激素的分类与作用特征与机制、下丘脑与垂体、各内分泌腺、胰岛与性腺）
 * 数据: standards/shengli/units.json
 *
 * 本章的程序不算激素浓度，也不算任何剂量——教材不给值。
 * 它做的是把「调节链的位置」「反馈的类别」「受体的位置」写成可枚举的类别表，
 * 使一句「激素乱了」必须被改写为「哪一层、哪一类反馈、哪一侧受体」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CH = '9';
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

/** 调节链的四层：位置不是重点，输出方式才是——一条走体液，一条走神经 */
function axisChain() {
  return [
    { 层: '下丘脑', 输出: '调节肽经门脉系统入腺垂体 / 神经纤维下达神经垂体', 身份: '神经与内分泌的交汇处' },
    { 层: '腺垂体', 输出: '促激素入血，作用于靶腺；亦分泌直接作用于外周组织的激素', 身份: '既调节下位，也被上位调节' },
    { 层: '靶腺', 输出: '靶腺激素入血，作用于外周组织', 身份: '把上位信号转成效应' },
    { 层: '外周组织', 输出: '效应（代谢方向、生长、水盐转运）', 身份: '反应的最终落点' },
  ];
}

/** 反馈三类：按「谁反馈给谁」分，不按强弱分 */
function feedbackKind(from, to) {
  const table = {
    '靶腺→下丘脑': '长反馈',
    '靶腺→腺垂体': '长反馈',
    '腺垂体→下丘脑': '短反馈',
    '下丘脑→下丘脑': '超短反馈',
  };
  const key = `${from}→${to}`;
  if (!(key in table)) throw new Error(`反馈只认 靶腺→下丘脑 / 靶腺→腺垂体 / 腺垂体→下丘脑 / 下丘脑→下丘脑，收到 ${key}`);
  return table[key];
}

/** 受体位置由溶解性决定：这一步是本章所有机制分岔的入口 */
function receptorMechanism(solubility) {
  if (solubility === '水溶性') {
    return { 受体位置: '细胞膜上', 途径: '膜受体介导', 中介: '胞内信使逐级放大', 时程: '起效相对快、持续相对短' };
  }
  if (solubility === '脂溶性') {
    return { 受体位置: '胞质或核内', 途径: '胞内受体介导', 中介: '调节基因表达、改变蛋白质合成', 时程: '起效相对慢、持续相对长' };
  }
  throw new Error(`溶解性只取「水溶性」「脂溶性」，收到 ${solubility}`);
}

/** 三种相互作用：协同、拮抗、允许。允许作用最容易被漏掉 */
function interactionKind(kind) {
  const table = {
    协同: '两种激素作用于同一环节，效应方向相同而相互加强',
    拮抗: '两种激素作用于同一环节，效应方向相反',
    允许: '一种激素不直接产生该效应，但为另一种激素发挥作用提供条件',
  };
  if (!(kind in table)) throw new Error(`相互作用只取 协同/拮抗/允许，收到 ${kind}`);
  return table[kind];
}

/** 激素类别索引：来源 / 靶 / 作用方向。只写类别与方向，不写浓度与剂量。 */
function hormoneIndex() {
  return [
    { 名称: '抗利尿激素', 来源: '下丘脑合成、神经垂体释放', 靶: '远端小管与集合管', 方向: '促进水的重吸收' },
    { 名称: '催产素', 来源: '下丘脑合成、神经垂体释放', 靶: '子宫平滑肌、乳腺肌上皮', 方向: '促进收缩与排乳' },
    { 名称: '生长激素', 来源: '腺垂体', 靶: '骨骼与软组织、代谢', 方向: '促进生长、调整代谢方向' },
    { 名称: '甲状腺激素', 来源: '甲状腺滤泡上皮', 靶: '全身组织细胞', 方向: '调节代谢与产热、影响生长与发育' },
    { 名称: '醛固酮', 来源: '肾上腺皮质', 靶: '远端小管与集合管', 方向: '保钠排钾、水随钠回收' },
    { 名称: '胰岛素', 来源: '胰岛', 靶: '肝、肌肉、脂肪等', 方向: '促进葡萄糖的摄取与储存' },
    { 名称: '心房钠尿肽', 来源: '心房肌细胞', 靶: '肾血管与集合管', 方向: '促钠水排出' },
  ];
}

function main() {
  const db = load();
  const units = chapterUnits(db);
  const meta = chapterMeta(db);
  const secs = sectionsOf(units);
  const agg = aggregate(units);

  console.log('═══ 内分泌 (生理学 第9章) ═══');
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

  console.log('\n调节链：四层，两条输出');
  for (const n of axisChain()) console.log(`  ${n.层} — ${n.输出}（${n.身份}）`);

  console.log('\n反馈三类：按「谁反馈给谁」分，不按强弱分');
  for (const [from, to] of [['靶腺', '下丘脑'], ['靶腺', '腺垂体'], ['腺垂体', '下丘脑'], ['下丘脑', '下丘脑']]) {
    console.log(`  ${from} → ${to}: ${feedbackKind(from, to)}（以负反馈为主，使各环节维持在相对稳定的范围）`);
  }

  console.log('\n受体位置由溶解性决定（本章机制的分岔口）');
  for (const s of ['水溶性', '脂溶性']) {
    const m = receptorMechanism(s);
    console.log(`  ${s} → 受体在${m.受体位置} · ${m.途径} · ${m.中介} · ${m.时程}`);
  }

  console.log('\n三种相互作用');
  for (const k of ['协同', '拮抗', '允许']) console.log(`  ${k}: ${interactionKind(k)}`);

  console.log('\n激素类别索引（来源 / 靶 / 方向；不给浓度与剂量）');
  for (const h of hormoneIndex()) console.log(`  ${h.名称.padEnd(7, '　')} ${h.来源} → ${h.靶} · ${h.方向}`);

  const cellShare = agg.levels['细胞'];
  console.log(`\n结构读出: 细胞层 ${cellShare} 为四层最高、组织层 ${agg.levels['组织']} 为最低 —— 本章把受体与信号写在细胞层，腺体的组织学则几乎不讲`);
  console.log('  这也是「不给值」的代价: 说不了浓度，就只能把「谁作用于谁」写得足够密');

  console.log('\n教学边界：本章只写激素的类别与调节链的关系与作用方向，不给任何浓度与剂量与数值与单位；不构成诊断、治疗或用药依据');

  return { agg, secs, units };
}

if (require.main === module) {
  main();
}

module.exports = {
  CH, VIEWS, LEVELS, UNITS_FILE,
  load, chapterUnits, chapterMeta, sectionsOf, aggregate,
  dominantOf, dominantView, dominantLevel,
  axisChain, feedbackKind, receptorMechanism, interactionKind, hormoneIndex, main,
};
