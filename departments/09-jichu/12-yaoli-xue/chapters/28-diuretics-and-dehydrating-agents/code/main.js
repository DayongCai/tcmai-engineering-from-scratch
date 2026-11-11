#!/usr/bin/env node
/**
 * 药理学 · 第 28 章 利尿药与脱水药：一条钠离子路线，两套药物
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/28-diuretics-and-dehydrating-agents/docs/zh.md
 * 出处: 教材·药理学·第28章（28.1–28.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=28]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题有两句——
 *   「利尿药动肾小管的钠重吸收，脱水药动血管与组织之间的水分布」，
 *   「底本用了两整节（28.3 与 28.4）写怎么表述与体内过程，这两节占了多少篇幅」。
 * 两句都能落在可复算的结构上：四个作用部位词的主峰、三个分工词各自的主峰节、
 * 表述两节在全书里的占比。手打会在教材改版后静默过期，现算的数字一对不上测试就红。
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
const CHAPTER = 28;

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

/** 按节汇总（章级命题多用这一口径：词在哪一节压得最重，而不是哪个小节） */
function sectionHits(chap, word) {
  const rows = chap.secs.map((s) => ({
    sec: s.no,
    hits: s.subs.reduce((n, u) => n + (u.body.match(new RegExp(word, 'g')) || []).length, 0),
  }));
  const total = rows.reduce((n, r) => n + r.hits, 0);
  const top = [...rows].sort((a, b) => b.hits - a.hits)[0] || { sec: '', hits: 0 };
  return { word, total, rows, top };
}

/**
 * 四个作用部位：本章按部位分类的解剖依据。
 * 判据是它们都出现在 28.1 里，且主峰落在 28.1.1（肾脏生理学基础与作用部位）。
 */
const SITES = ['近曲小管', '髓袢', '远曲小管', '集合管'];

function siteAudit(chap) {
  return SITES.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((x, y) => y.hits - x.hits)[0] || { sub: '', hits: 0 };
    return {
      word: w,
      total: h.total,
      top: top.sub,
      topHits: top.hits,
      inSec1: h.per.every((p) => p.sub.startsWith('28.1.')),
      secs: [...new Set(h.per.map((p) => p.sub.split('.').slice(0, 2).join('.')))],
    };
  });
}

/**
 * 三个分工词：利尿（排出）与脱水（转移）分居两节，渗透压是后者的机制词。
 * 判据是各自的主峰节——若「脱水」的主峰不在 28.2，本章的命题就不成立。
 */
const DIVISION = [
  { word: '利尿', sec: '28.1', what: '改变肾小管对滤过液的处理（排出）' },
  { word: '脱水', sec: '28.2', what: '改变血管与组织之间的水分布（转移）' },
  { word: '渗透压', sec: '28.2', what: '转移与渗透性利尿共同的物理量' },
];

function divisionAudit(chap) {
  return DIVISION.map((d) => {
    const s = sectionHits(chap, d.word);
    return {
      word: d.word,
      total: s.total,
      top: s.top.sec,
      topHits: s.top.hits,
      sec: d.sec,
      what: d.what,
      ok: s.top.sec === d.sec,
      rows: s.rows,
    };
  });
}

/** 表述两节（28.3 观察与表述要求 + 28.4 体内过程与不良反应）的篇幅占比 */
function wordingShare(chap) {
  const secs = sectionStats(chap);
  const total = secs.reduce((n, x) => n + x.hanzi, 0);
  const wording = secs.filter((x) => x.no === '28.3' || x.no === '28.4')
    .reduce((n, x) => n + x.hanzi, 0);
  return { total, wording, share: Math.round((wording / total) * 1000) / 10 };
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
  const sites = siteAudit(chap);
  const div = divisionAudit(chap);
  const share = wordingShare(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 利尿药与脱水药：一条钠离子路线，两套药物（药理学 第28章）═══');
  console.log(`教材规模: 第28章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，落在 ${values.offenders.map((o) => `${o.sub}(${o.hits})`).join(' ')}`);
  console.log('');
  console.log('四个作用部位（按部位分类的解剖依据）：');
  for (const x of sites) {
    console.log(`  ${x.word} ${x.total} 次 · 主峰 ${x.top}（${x.topHits} 次）· 分布 ${x.secs.join('/')} · ${x.inSec1 ? '都在 28.1' : '越出 28.1'}`);
  }
  console.log('');
  console.log('三个分工词的主峰节（排出 / 转移 / 物理量）：');
  for (const d of div) {
    console.log(`  ${d.word} ${d.total} 次 · 主峰 ${d.top}（${d.topHits} 次）· 认领 ${d.sec} ${d.what} · ${d.ok ? '各归其位' : '越界'}`);
  }
  console.log('');
  console.log(`表述两节的篇幅: 28.3 + 28.4 合计 ${share.wording} 字，占全章 ${share.share}%（十二个小节里有六个在讲「怎么写」与「怎么走」）`);
  console.log(`12 个小节汉字（最薄 ${ext.thinnest.sub} ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明利尿药与脱水药的分类、作用部位与体内过程类别，不写剂量与浓度与检验量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, sites, division: div, share, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  SITES,
  DIVISION,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  sectionHits,
  siteAudit,
  divisionAudit,
  wordingShare,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
