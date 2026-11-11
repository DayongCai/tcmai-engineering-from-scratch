'use strict';
/**
 * 第 14 章 · 攻毒杀虫与拔毒化腐：毒性与用法边界
 *
 * 本章对应教材第 28 章（攻毒杀虫止痒药，7 味）与第 29 章（拔毒化腐生肌药，5 味），
 * 共 2,262 字 / 12 味药。这是全教材毒性最集中的一组：大毒 2 味（升药、砒石），
 * 有毒 6 味，小毒 1 味，只供外用 3 味。
 *
 * 它正好是第 12 章的反面教材：第 12 章把性味归经编成 21 维向量，向量里**没有一个维度是毒性**。
 * 而本章 12 味药里，决定能不能用的第一件事就是毒性，第二件事才是功效。
 *
 * 数据一律从 standards/zhongyao/{drugs,底本}.json 现算，不手抄毒性分级。
 */

const fs = require('node:fs');
const path = require('node:path');

// 向上找仓根：code → 14-gongdu-badu → chapters → 01-zhongyaoxue → 02-zhongyao → departments → 仓根
const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');

/** 本章覆盖的教材章 */
const CHAPTERS = ['28', '29'];

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** 毒性分级：只从「来源与性味归经」段的性味句里读，不从功效段猜 */
function toxOf(fields) {
  const src = fields['来源与性味归经'] || '';
  if (/有大毒/.test(src)) return '大毒';
  if (/小毒/.test(src)) return '小毒';
  if (/有毒/.test(src)) return '有毒';
  return '未标';
}

/** 用法边界：只供外用 / 有内服量 */
function useOf(fields) {
  const use = fields['用法用量与使用注意'] || '';
  const onlyTopical = /只供外用|不作内服/.test(use);
  const m = use.match(/(?:内服|煎服|冲服)\s*(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)g/);
  return {
    onlyTopical,
    dose: m ? { raw: m[0].replace(/^(?:内服|煎服|冲服)\s*/, ''), min: Number(m[1]), max: Number(m[2]) } : null,
    preg: /孕妇禁用|孕妇忌用/.test(use + (fields['来源与性味归经'] || '')),
  };
}

/** 12 味药的结构化视图（名称一律取自 drugs.json，不手写） */
function drugs() {
  const d = readJson(DRUGS);
  const rows = d.drugs
    .filter((x) => CHAPTERS.includes(String(x.chapter)))
    .map((x) => {
      const use = useOf(x.fields);
      return {
        name: x.name,
        chapter: String(x.chapter),
        sub: x.sub,
        qi: x.nature.qi,
        wei: x.nature.wei,
        gui: x.nature.guijing,
        tox: toxOf(x.fields),
        onlyTopical: use.onlyTopical,
        dose: use.dose,
        preg: use.preg,
        natureKeys: Object.keys(x.nature),
      };
    });
  return { total: d.counts.drugs, rows };
}

/** 教材两章的规模：字数/节/小节/段 全部读 counts */
function scale() {
  const b = readJson(BASE);
  const rows = CHAPTERS.map((no) => {
    const ch = b.chapters.find((x) => x.no === no);
    if (!ch) throw new Error(`底本里没有第 ${no} 章`);
    return { no, title: ch.title, chars: ch.counts.chars, secs: ch.counts.secs, subs: ch.counts.subs, paras: ch.counts.paras };
  });
  const add = (k) => rows.reduce((n, r) => n + r[k], 0);
  return { chapters: rows.length, chars: add('chars'), secs: add('secs'), subs: add('subs'), paras: add('paras'), rows };
}

/** 毒性分布：{大毒:n, 有毒:n, 小毒:n, 未标:n} */
function toxSummary() {
  const out = { 大毒: 0, 有毒: 0, 小毒: 0, 未标: 0 };
  for (const r of drugs().rows) out[r.tox] += 1;
  return out;
}

/** 只供外用的药名（按 drugs.json 顺序） */
function topicalOnly() {
  return drugs().rows.filter((r) => r.onlyTopical).map((r) => r.name);
}

/** 内服量从低到高排（只有带克数区间的入列） */
function doseRank() {
  return drugs().rows
    .filter((r) => r.dose)
    .map((r) => ({ name: r.name, raw: r.dose.raw, min: r.dose.min, max: r.dose.max }))
    .sort((a, b) => a.max - b.max || a.min - b.min);
}

/** 孕妇禁忌药名 */
function pregnancyBanned() {
  return drugs().rows.filter((r) => r.preg).map((r) => r.name);
}

function main() {
  const s = scale();
  const { total, rows } = drugs();
  const tox = toxSummary();
  const top = topicalOnly();
  const rank = doseRank();
  const preg = pregnancyBanned();

  console.log('═══ 攻毒杀虫与拔毒化腐：毒性与用法边界（教材·第28/29章）═══');
  console.log(`  教材两章：${s.chapters} 章 / ${s.secs} 节 / ${s.subs} 小节 / ${s.paras} 段 / ${s.chars} 字`);
  console.log(`  收药 ${rows.length} 味（药库 ${total} 味中的 ${((rows.length / total) * 100).toFixed(2)}%）`);
  console.log('\n── 12 味：气 / 味 / 归经 / 毒性 / 用法 ──');
  for (const r of rows) {
    const use = r.onlyTopical ? '只供外用' : r.dose ? `内服 ${r.dose.raw}` : '用法未载内服量';
    console.log(`  ${r.name.padEnd(3, '　')} 第${r.chapter}章 · ${(r.qi + '　').slice(0, 3)} · ${r.wei.join('、').padEnd(4, '　')} · 归${r.gui.join('、')} · ${r.tox.padEnd(2, '　')} · ${use}${r.preg ? ' · 孕妇禁/忌' : ''}`);
  }
  console.log('\n── 毒性分布（教材原文标注，未标不等于无毒）──');
  console.log(`  大毒 ${tox['大毒']} · 有毒 ${tox['有毒']} · 小毒 ${tox['小毒']} · 未标 ${tox['未标']}`);
  console.log(`  只供外用 ${top.length} 味：${top.join('、')}`);
  console.log(`  孕妇禁用/忌用 ${preg.length} 味：${preg.join('、')}`);
  console.log('\n── 内服量从低到高（克数区间，仅教材写成 g 的）──');
  console.log(`  ${rank.map((x) => `${x.name} ${x.raw}`).join(' · ')}`);
  console.log(`  最低 ${rank[0].name} ${rank[0].raw}，最高上限 ${rank[rank.length - 1].name} ${rank[rank.length - 1].max} g——相差 ${Math.round(rank[rank.length - 1].max / rank[0].min)} 倍`);
  console.log('\n── 与第 12 章向量的关系 ──');
  console.log(`  12 味的 nature 字段只有 ${[...new Set(rows.flatMap((r) => r.natureKeys))].filter((k) => k !== 'raw').join('/')} 三个结构化键（另有一个 raw 原文回溯位），没有毒性维度：`);
  console.log('  性能向量能把雄黄与硫黄排得很近（同温同辛），却说不出一味有大毒、一味有毒。');
  console.log('\n提醒：本章 12 味里 9 味标了毒性、3 味只供外用——「以毒攻毒」的前提是有明确的用法边界，不是胆子大。');
  console.log('教学边界：本章只整理教材第28/29章的毒性分级、用法边界与克数区间，毒性标注直接取自教材原文，不构成用药依据。');
}

if (require.main === module) main();

module.exports = { CHAPTERS, toxOf, useOf, drugs, scale, toxSummary, topicalOnly, doseRank, pregnancyBanned };
