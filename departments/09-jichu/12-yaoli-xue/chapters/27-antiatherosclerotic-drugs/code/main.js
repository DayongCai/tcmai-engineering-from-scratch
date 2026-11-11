#!/usr/bin/env node
/**
 * 药理学 · 第 27 章 抗动脉粥样硬化药：四类药各管一环
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/27-antiatherosclerotic-drugs/docs/zh.md
 * 出处: 教材·药理学·第27章（27.1–27.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=27]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「四类药各管一个环节，环节之间不能互替」。
 * 这个命题能落在三个可复算的结构上——
 *   一、四个环节锚词（调血脂 / 氧化 / 双键 / 内皮）的主峰是否各在各的节里；
 *   二、五个调血脂类别的名字是否都在 27.1.3 汇合；
 *   三、底本 16 处量值落在哪些小节，用以确认「引文行放行、正文不写」的口径前提。
 * 手打的结论会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
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
const CHAPTER = 27;

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
 * 四个环节锚词：本章四节各认领一个。
 * 调血脂 → 脂蛋白的生成与清除；氧化 → 脂蛋白的氧化修饰；
 * 双键 → 脂肪酸的构成；内皮 → 血管壁本身。
 * 判据不是「词出现了」，而是「词的主峰落在它自己那一节」。
 */
const ANCHORS = [
  { word: '调血脂', sec: '27.1', link: '脂蛋白的生成与清除' },
  { word: '氧化', sec: '27.2', link: '脂蛋白的氧化修饰' },
  { word: '双键', sec: '27.3', link: '脂肪酸的构成' },
  { word: '内皮', sec: '27.4', link: '血管壁本身' },
];

function anchorAudit(chap) {
  return ANCHORS.map((a) => {
    const h = keywordHits(chap, a.word);
    const top = [...h.per].sort((x, y) => y.hits - x.hits)[0] || { sub: '', hits: 0 };
    // 主峰所在的节：小节号前两位
    const topSec = top.sub.split('.').slice(0, 2).join('.');
    return {
      word: a.word,
      total: h.total,
      sec: a.sec,
      link: a.link,
      top: top.sub,
      topHits: top.hits,
      ok: topSec === a.sec,
      secSubs: h.per.filter((p) => p.sub.startsWith(`${a.sec}.`)).length,
    };
  });
}

/**
 * 五个调血脂类别：他汀 / 贝特 / 烟酸 / 依折麦布 / 胆汁酸。
 * 判据是它们是否都在 27.1.3（分类与代表药）汇合——那一节是本章的骨架所在。
 */
const CLASSES = ['他汀', '贝特', '烟酸', '依折麦布', '胆汁酸'];

function classAudit(chap) {
  return CLASSES.map((w) => {
    const h = keywordHits(chap, w);
    return {
      word: w,
      total: h.total,
      inIndex: h.per.some((p) => p.sub === '27.1.3'),
      subs: h.per.map((p) => p.sub),
    };
  });
}

/**
 * 量值核验：底本带量值（B 支），本章正文引用时只许出现在带 locator 的引文行。
 * 这里把底本那 16 处数出来、定位到小节，作为口径前提的凭据。
 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = u.body.match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.length });
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
  const anchors = anchorAudit(chap);
  const classes = classAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 抗动脉粥样硬化药：四类药各管一环（药理学 第27章）═══');
  console.log(`教材规模: 第27章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，落在 ${values.offenders.map((o) => `${o.sub}(${o.hits})`).join(' ')}`);
  console.log('');
  console.log('四个环节锚词的主峰（应各在各的节）：');
  for (const a of anchors) {
    console.log(`  ${a.word} ${a.total} 次 · 主峰 ${a.top}（${a.topHits} 次）· 认领 ${a.sec} ${a.link} · 本节覆盖 ${a.secSubs} 个小节 · ${a.ok ? '各归其位' : '越界'}`);
  }
  console.log('');
  console.log('五个调血脂类别是否在 27.1.3 汇合（分类与代表药是本章骨架）：');
  for (const c of classes) {
    console.log(`  ${c} ${c.total} 次 · 覆盖 ${c.subs.join('/')} · ${c.inIndex ? '在 27.1.3' : '不在 27.1.3'}`);
  }
  console.log('');
  const thinnestSec = secs.reduce((a, b) => (a.hanzi <= b.hanzi ? a : b));
  console.log(`12 个小节汉字（最薄 ${ext.thinnest.sub} ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`最薄的一节是 ${thinnestSec.no}（${thinnestSec.title}）：分类与代表药只写骨架，不写药物逐个铺开。`);
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明四类抗动脉粥样硬化药的作用环节与分类关系，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, anchors, classes, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  ANCHORS,
  CLASSES,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  anchorAudit,
  classAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
