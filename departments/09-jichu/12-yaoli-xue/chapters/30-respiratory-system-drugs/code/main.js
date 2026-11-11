#!/usr/bin/env node
/**
 * 药理学 · 第 30 章 呼吸系统药：三种切法，一条「作用—应用—观察」
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/30-respiratory-system-drugs/docs/zh.md
 * 出处: 教材·药理学·第30章（30.1–30.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=30]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章最容易被读成「三类平喘 + 两类镇咳 + 两类祛痰」的清单。
 * 但四节的切法并不相同——30.1 与 30.2 按类别分小节，30.3 按要素（分类/机制/体内过程）分，
 * 30.4 按方法（边界/记录/复核）分。三套切法能从两个地方复算出来：
 *   一、小节标题本身（切法）；
 *   二、类名与「观察/记录/复核」三类词的主峰落在哪个小节（证据）。
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
const CHAPTER = 30;

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
const bareTitle = (t) => t.replace(/^\d+\.\d+(\.\d+)?\s*/, '');

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
 * 切法判定：只看小节标题。
 *   要素式——标题是「分类与代表药 / 药理作用与作用机制 / 体内过程与…」
 *   方法式——标题是「表述边界 / 观察与记录 / 复核与留痕」
 *   类别式——其余（标题就是一个药物类别，如「支气管扩张药」）
 * 一章里三种切法并存，是本章结构上最有意思的一处。
 */
const ELEMENT_RE = /^(分类|药理作用|体内过程)/;
const METHOD_RE = /(表述|观察|复核)/;

function cutOf(title) {
  const t = bareTitle(title);
  if (ELEMENT_RE.test(t)) return '要素';
  if (METHOD_RE.test(t)) return '方法';
  return '类别';
}

function cutAudit(chap) {
  return chap.secs.map((s) => ({
    sec: s.no,
    title: s.title.replace(/^\d+\.\d+\s*/, ''),
    cuts: s.subs.map((u) => cutOf(u.title)),
    titles: s.subs.map((u) => bareTitle(u.title)),
  }));
}

/**
 * 类名词归位：
 *   平喘三类（支气管扩张 / 抗炎 / 抗过敏）应各在各的小节；
 *   镇咳两类（中枢性 / 外周性）都落在 30.2.3（分类与代表药并列两条线索）；
 *   祛痰两类（恶心性 / 黏痰溶解）都落在 30.3.1（30.3 不按类别分小节）。
 * 三种结局恰好对应三种切法——这是本章的核心证据。
 */
const CLASSES = [
  { word: '支气管扩张', sec: '30.1', own: '30.1.1', what: '平喘之一：松弛平滑肌' },
  { word: '抗炎', sec: '30.1', own: '30.1.2', what: '平喘之二：控制气道炎症' },
  { word: '抗过敏', sec: '30.1', own: '30.1.3', what: '平喘之三：预防发作' },
  { word: '中枢性', sec: '30.2', own: '30.2.3', what: '镇咳之一：抑制延髓咳嗽中枢' },
  { word: '外周性', sec: '30.2', own: '30.2.3', what: '镇咳之二：作用于反射弧外周' },
  { word: '恶心性', sec: '30.3', own: '30.3.1', what: '祛痰之一：反射性增加分泌' },
  { word: '黏痰溶解', sec: '30.3', own: '30.3.1', what: '祛痰之二：改变痰液黏性结构' },
];

function classAudit(chap) {
  return CLASSES.map((c) => {
    const h = keywordHits(chap, c.word);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return {
      word: c.word,
      sec: c.sec,
      own: c.own,
      what: c.what,
      total: h.total,
      top: top.sub,
      topHits: top.hits,
      onOwn: top.sub === c.own,
      subs: h.per.map((p) => p.sub),
    };
  });
}

/**
 * 方法词：观察 / 记录 / 复核。
 * 判据是三个词的主峰都落在 30.4（观察与表述要求）——方法一层的重量压在那里。
 */
const METHOD_WORDS = ['观察', '记录', '复核'];

function methodAudit(chap) {
  return METHOD_WORDS.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return {
      word: w,
      total: h.total,
      top: top.sub,
      topHits: top.hits,
      topSec: top.sub.split('.').slice(0, 2).join('.'),
      secs: [...new Set(h.per.map((p) => p.sub.split('.').slice(0, 2).join('.')))],
    };
  });
}

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
  const cuts = cutAudit(chap);
  const classes = classAudit(chap);
  const methods = methodAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 呼吸系统药：三种切法，一条「作用—应用—观察」（药理学 第30章）═══');
  console.log(`教材规模: 第30章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，落在 ${values.offenders.map((o) => `${o.sub}(${o.hits})`).join(' ')}`);
  console.log('');
  console.log('四节的切法（只看小节标题）：');
  for (const c of cuts) {
    console.log(`  ${c.sec} ${c.cuts.join('/')} · ${c.titles.join(' → ')}`);
  }
  console.log('  → 30.1 与 30.2 按类别分节，30.3 按要素分节，30.4 按方法分节：一章三种切法。');
  console.log('');
  console.log('七个类名词的主峰（三种结局对应三种切法）：');
  for (const c of classes) {
    console.log(`  ${c.word} ${c.total} 次 · 主峰 ${c.top}（${c.topHits} 次）· 认领 ${c.sec} · ${c.onOwn ? '各归其位' : `落在 ${c.top}（分类汇总处）`}`);
  }
  console.log('');
  console.log('三个方法词的主峰（方法一层的重量压在哪）：');
  for (const m of methods) {
    console.log(`  ${m.word} ${m.total} 次 · 主峰 ${m.top}（${m.topHits} 次）· 跨 ${m.secs.length} 节`);
  }
  console.log('');
  console.log(`12 个小节汉字（最薄 ${ext.thinnest.sub} ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明呼吸系统药的分类、作用环节与观察记录要求，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, cuts, classes, methods, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  CLASSES,
  METHOD_WORDS,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  cutOf,
  shape,
  sectionStats,
  keywordHits,
  cutAudit,
  classAudit,
  methodAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
