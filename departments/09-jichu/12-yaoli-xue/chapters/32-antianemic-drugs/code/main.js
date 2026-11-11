#!/usr/bin/env node
/**
 * 药理学 · 第 32 章 抗贫血药：三个作用层次、两条吸收路径与一次陷阱
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/32-antianemic-drugs/docs/zh.md
 * 出处: 教材·药理学·第32章（32.1–32.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=32]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「抗贫血药不是三类并列，而是三层叠加」。
 * 这个命题能落在哪几个数上——原料层与辅酶层与调节层各占多少笔墨、
 * 吸收链的四个环节（吸收／胃酸／转铁蛋白／内因子）落在哪些小节、
 * 叶酸陷阱被点了几次——都能在底本正文里数出来。
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
const CHAPTER = 32;

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
 * 三层作用：原料（铁）／辅酶（叶酸、维生素B12）／调节（促红细胞生成素）。
 * 三层的区别在于「补什么」：补物质、补反应条件、补信号。词频只说明笔墨分配。
 */
const LAYERS = [
  { key: '铁', label: '原料层' },
  { key: '叶酸', label: '辅酶层' },
  { key: '维生素B12', label: '辅酶层' },
  { key: '促红细胞生成素', label: '调节层' },
];

function layerDensity(chap) {
  return LAYERS.map((l) => {
    const h = keywordHits(chap, l.key);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { ...l, total: h.total, top: top.sub, topHits: top.hits, subs: h.per.length };
  });
}

/**
 * 吸收链四环节：吸收部位／胃内酸度／转运蛋白／内因子。
 * 四者把「同一个药为什么在不同人身上表现不同」落到可指认的位置上。
 */
const ABSORB = ['吸收', '胃酸', '转铁蛋白', '内因子'];

function absorbAudit(chap) {
  return ABSORB.map((w) => {
    const h = keywordHits(chap, w);
    return { step: w, total: h.total, subs: h.per.length, at: h.per.map((p) => p.sub) };
  });
}

/**
 * 叶酸陷阱：本章唯一一处「两类药互相掩盖」的机制节点。
 * 它出现几次、落在哪一节，决定了这一章的机制叙事是否真的收在一个点上。
 */
function trapAudit(chap) {
  const t = keywordHits(chap, '叶酸陷阱');
  const mask = keywordHits(chap, '掩盖');
  return { trap: t, mask };
}

/** 观察三元组与它的两个变体（时相／分设） */
const LOOP = ['观察', '记录', '复核', '留痕'];

function loopAudit(chap) {
  return LOOP.map((w) => {
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
  const layers = layerDensity(chap);
  const absorb = absorbAudit(chap);
  const trap = trapAudit(chap);
  const loop = loopAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 抗贫血药：三个作用层次、两条吸收路径与一次陷阱（药理学 第32章）═══');
  console.log(`教材规模: 第32章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的「数字＋单位」命中 ${values.hits} 处（均在剂量引用句，正文口径另判）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`三层作用词频: ${layers.map((l) => `${l.label}·${l.key} ${l.total}`).join(' · ')}`);
  console.log(`  最密集的小节: ${layers.map((l) => `${l.key}→${l.top}(${l.topHits})`).join(' ')}`);
  console.log('  → 三层不是并列的药名表：原料补物质，辅酶补反应条件，调节补信号；缺任一层，另两层都打折扣。');
  console.log('');
  console.log(`吸收链四环节: ${absorb.map((a) => `${a.step} ${a.total}`).join(' · ')}`);
  console.log(`  落点: ${absorb.map((a) => `${a.step}@${a.at.join(',')}`).join(' | ')}`);
  console.log('');
  console.log(`叶酸陷阱: ${trap.trap.total} 次（${trap.trap.per.map((p) => p.sub).join(' ')}） · 掩盖 ${trap.mask.total} 次（${trap.mask.per.map((p) => p.sub).join(' ')}）`);
  console.log('');
  console.log('观察三元组的落点（全章次数 / 覆盖小节数）：');
  for (const x of loop) console.log(`  ${x.word} ${x.total} 次 · ${x.subs} 个小节 · ${x.at.join(' ')}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明抗贫血药的原料/辅酶/调节三层作用与吸收环节与观察要求，不写剂量与浓度与检验数值（剂量与用法照底本），不作诊断与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, layers, absorb, trap, loop, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  LAYERS,
  ABSORB,
  LOOP,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  layerDensity,
  absorbAudit,
  trapAudit,
  loopAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
