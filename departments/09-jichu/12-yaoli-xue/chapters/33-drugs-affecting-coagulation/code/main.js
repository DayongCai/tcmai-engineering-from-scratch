#!/usr/bin/env node
/**
 * 药理学 · 第 33 章 作用于凝血系统药物：一个平衡的四个方向
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/33-drugs-affecting-coagulation/docs/zh.md
 * 出处: 教材·药理学·第33章（33.1–33.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=33]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「四类药不是四个抽屉，而是同一个平衡上的四个方向」。
 * 这个命题能落在哪几个数上——抗凝与纤溶与抗血小板与促凝各占多少笔墨、
 * 抗凝四类的靶点词（凝血酶／Ⅹa／维生素K／抗凝血酶）各被点了几次、
 * 「出血」在哪些小节被反复提到——都能在底本正文里数出来。
 * 手打会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIBEN = path.join('standards', 'yaoli', '底本.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, DIBEN))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/yaoli/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const FILE = path.join(ROOT, DIBEN);
const CHAPTER = 33;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(u.body), 0),
  };
}

function sectionStats(chap) {
  return chap.secs.map((s) => {
    const h = s.subs.reduce((n, u) => n + hanzi(u.body), 0);
    return {
      no: s.no,
      title: s.title.replace(/^\d+\.\d+\s*/, ''),
      subs: s.subs.length,
      hanzi: h,
      avg: Math.round(h / s.subs.length),
    };
  });
}

function keywordHits(chap, word) {
  const per = [];
  let total = 0;
  for (const u of subsOf(chap)) {
    const n = (u.body.match(new RegExp(word, 'g')) || []).length;
    if (n) per.push({ sub: u.no, hits: n });
    total += n;
  }
  return { word, total, per };
}

/**
 * 四个方向：抗凝、纤溶、抗血小板、促凝。
 * 前三个方向指向「不让血栓形成或让它化开」，第四个方向指向「让血止住」。
 * 词频只说明笔墨分配，不说明哪一个方向更重要。
 */
const DIRECTIONS = [
  { key: '抗凝', label: '抗凝血药' },
  { key: '纤溶', label: '纤维蛋白溶解药' },
  { key: '抗血小板', label: '抗血小板药' },
  { key: '促凝', label: '促凝血药' },
];

function directionDensity(chap) {
  return DIRECTIONS.map((d) => {
    const h = keywordHits(chap, d.key);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { ...d, total: h.total, top: top.sub, topHits: top.hits, subs: h.per.length };
  });
}

/**
 * 抗凝四类的靶点词：分类依据是靶点，不是给药途径，也不是起效快慢。
 * 四个词是否都在正文出现，决定了「按靶点分类」这句话是否有正文支撑。
 */
const TARGETS = ['凝血酶', 'Ⅹa', '维生素K', '抗凝血酶'];

function targetAudit(chap) {
  return TARGETS.map((w) => {
    const h = keywordHits(chap, w);
    return { target: w, total: h.total, subs: h.per.length, at: h.per.map((p) => p.sub) };
  });
}

/**
 * 溶栓药的两代：非纤维蛋白选择性（链激酶、尿激酶）与相对选择性（阿替普酶及改构产物）。
 * 教材用「选择性」而非「效果」区分代际，这里数一数三个词各自被点了几次。
 */
const GENERATIONS = ['链激酶', '尿激酶', '阿替普酶', '纤维蛋白'];

function generationAudit(chap) {
  return GENERATIONS.map((w) => {
    const h = keywordHits(chap, w);
    return { key: w, total: h.total, subs: h.per.length, at: h.per.map((p) => p.sub) };
  });
}

/**
 * 观察的四个词：出血、观察、记录、复核。
 * 前三节讲药，第四节讲怎么盯；「出血」贯穿全章，是四类药共同的不良反应类别。
 */
const WATCH = ['出血', '观察', '记录', '复核'];

function watchAudit(chap) {
  return WATCH.map((w) => {
    const h = keywordHits(chap, w);
    return { word: w, total: h.total, subs: h.per.length, at: h.per.map((p) => p.sub) };
  });
}

/** 量值核验：词表与 scripts/lib_value_caliber.js 同一套单位 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = u.body.match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.join(',') });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders };
}

function briefAudit(chap) {
  const need = ['剂量与用法照底本', '本书不构成用药建议'];
  return subsOf(chap).map((u) => ({
    sub: u.no,
    ok: need.every((k) => u.brief.includes(k)),
    missing: need.filter((k) => !u.brief.includes(k)),
  }));
}

function extremes(chap) {
  const rows = subsOf(chap).map((u) => ({ sub: u.no, hanzi: hanzi(u.body) }));
  const sorted = [...rows].sort((a, b) => a.hanzi - b.hanzi);
  return { thinnest: sorted[0], thickest: sorted[sorted.length - 1] };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const dirs = directionDensity(chap);
  const targets = targetAudit(chap);
  const gens = generationAudit(chap);
  const watch = watchAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 作用于凝血系统药物：一个平衡的四个方向（药理学 第33章）═══');
  console.log(`教材规模: 第33章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的「数字＋单位」命中 ${values.hits} 处（底本把剂量写在 brief 的引用句里，body 未落量值）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`四个方向词频: ${dirs.map((d) => `${d.label} ${d.total}`).join(' · ')}`);
  console.log(`  最密集的小节: ${dirs.map((d) => `${d.label}→${d.top}(${d.topHits})`).join(' ')}`);
  console.log('  → 四个方向落在同一条平衡的两侧：抗凝与纤溶与抗血小板指向「不让形成或让它化开」，促凝指向「止住」。');
  console.log('');
  console.log(`抗凝四类的靶点词: ${targets.map((t) => `${t.target} ${t.total}`).join(' · ')}`);
  console.log(`  落点: ${targets.map((t) => `${t.target}@${t.at.slice(0, 4).join(',')}`).join(' | ')}`);
  console.log('  → 分类依据是靶点，与给药途径、起效快慢没有一一对应关系。');
  console.log('');
  console.log(`溶栓两代的关键词: ${gens.map((g) => `${g.key} ${g.total}`).join(' · ')}`);
  console.log(`  选择性词「纤维蛋白」${gens.find((g) => g.key === '纤维蛋白').total} 次，分布 ${gens.find((g) => g.key === '纤维蛋白').subs} 个小节`);
  console.log('');
  console.log('观察四词的落点（全章次数 / 覆盖小节数）：');
  for (const x of watch) console.log(`  ${x.word} ${x.total} 次 · ${x.subs} 个小节 · ${x.at.join(' ')}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明作用于凝血系统药物的靶点分类/机制/体内过程与观察要求，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, dirs, targets, gens, watch, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  DIRECTIONS,
  TARGETS,
  GENERATIONS,
  WATCH,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  directionDensity,
  targetAudit,
  generationAudit,
  watchAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
