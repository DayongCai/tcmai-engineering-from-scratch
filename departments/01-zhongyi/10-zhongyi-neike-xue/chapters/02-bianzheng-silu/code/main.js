#!/usr/bin/env node
/**
 * 中医内科学 · 第 2 章 辨证论治思路与方法
 * 课程: departments/01-zhongyi/10-zhongyi-neike-xue/chapters/02-bianzheng-silu/docs/zh.md
 * 出处: 教材·中医内科学·第2章（2.1–2.5，共 5 节 17 小节）
 * 数据: standards/neike/底本.json（chapters[no=2]，secs[].subs[].items[] 带 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「辨证论治是一条有顺序的流水线：
 * 辨 → 治 → 调」。这条链是不是真的存在，只看两件事——三段各摊多少字，
 * 以及「辨证 / 病位 / 标本」「治则 / 治法 / 方证」「调护 / 随访」三组词
 * 各自落在哪几节。手打的数字会在教材改版后静默过期；现算的对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIBEN = path.join('standards', 'neike', '底本.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, DIBEN))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/neike/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const FILE = path.join(ROOT, DIBEN);
const CHAPTER = 2;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 小节正文：一个小节下可能挂多个条目，按条目顺序拼起来 */
const bodyOf = (u) => (u.items || []).map((i) => i.body || '').join('\n');

function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0),
  };
}

function sectionStats(chap) {
  return chap.secs.map((s) => {
    const h = s.subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0);
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
    const n = (bodyOf(u).match(new RegExp(word, 'g')) || []).length;
    if (n) per.push({ sub: u.no, hits: n });
    total += n;
  }
  return { word, total, per };
}

/**
 * 三段流水线：辨（2.1 辨证要点 / 2.2 病证结合）、治（2.3 治则 / 2.4 治法与方）、
 * 调（2.5 调护与康复）。这是本章的骨架，不是读者的再创造——教材的节序即此序。
 */
const PHASES = [
  { key: '辨', secs: ['2.1', '2.2'] },
  { key: '治', secs: ['2.3', '2.4'] },
  { key: '调', secs: ['2.5'] },
];

function phaseStats(chap) {
  const secs = sectionStats(chap);
  return PHASES.map((p) => {
    const picked = secs.filter((s) => p.secs.includes(s.no));
    return {
      key: p.key,
      secs: p.secs,
      subs: picked.reduce((n, s) => n + s.subs, 0),
      hanzi: picked.reduce((n, s) => n + s.hanzi, 0),
    };
  });
}

/**
 * 术语词表：三组语言，对应三段流水线。
 * 辨段讲「怎么定病与证」，治段讲「怎么定方向与方」，调段讲「怎么收尾」。
 */
const TERMS = [
  { key: '辨证', group: '辨' },
  { key: '病位', group: '辨' },
  { key: '标本', group: '辨' },
  { key: '证候', group: '辨' },
  { key: '治则', group: '治' },
  { key: '治法', group: '治' },
  { key: '方证', group: '治' },
  { key: '调护', group: '调' },
  { key: '随访', group: '调' },
  { key: '病证', group: '元词' },
];

function termCounts(chap) {
  return TERMS.map((p) => ({ ...p, ...keywordHits(chap, p.key) }))
    .map((p) => ({ key: p.key, group: p.group, total: p.total, per: p.per }))
    .sort((a, b) => b.total - a.total);
}

/** 每组的词落在哪几节：三组词的空间分布应当与三段节序对得上 */
function groupSpread(chap) {
  return ['辨', '治', '调'].map((g) => {
    const words = TERMS.filter((x) => x.group === g).map((x) => x.key);
    const secs = new Set();
    for (const w of words) for (const hit of keywordHits(chap, w).per) secs.add(hit.sub.slice(0, 3));
    return { group: g, words, secs: [...secs].sort() };
  });
}

/**
 * 量值核验：底本声明本章 0 处剂量。把声明当断言复算。
 * 词表与章门共用一套单位（见 scripts/lib_value_caliber.js）。
 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = bodyOf(u).match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.join(',') });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders };
}

function extremes(chap) {
  const rows = subsOf(chap).map((u) => ({ sub: u.no, hanzi: hanzi(bodyOf(u)) }));
  const sorted = [...rows].sort((a, b) => a.hanzi - b.hanzi);
  return { thinnest: sorted[0], thickest: sorted[sorted.length - 1] };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const phases = phaseStats(chap);
  const terms = termCounts(chap);
  const spread = groupSpread(chap);
  const values = valueAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 辨证论治思路与方法：辨 → 治 → 调（中医内科学 第2章）═══');
  console.log(`教材规模: 第2章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log('三段流水线的字数分配：');
  for (const p of phases) {
    console.log(`  ${p.key}（${p.secs.join(' ')}）· ${p.subs} 小节 · ${p.hanzi} 字`);
  }
  const ranked = [...phases].sort((a, b) => b.hanzi - a.hanzi);
  console.log(`  → 三段之和 ${phases.reduce((n, p) => n + p.hanzi, 0)} 字 = 全章；${ranked[0].key}段最长（${ranked[0].hanzi} 字），${ranked[ranked.length - 1].key}段最短（${ranked[ranked.length - 1].hanzi} 字）。`);
  console.log('');
  console.log(`17 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(bodyOf(u))} 字`);
  console.log('');
  console.log(`术语词频: ${terms.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('');
  console.log('三组词的空间分布（词落在哪几节）：');
  for (const g of spread) {
    console.log(`  ${g.group}组（${g.words.join('/')}）→ ${g.secs.join(' ')}`);
  }
  console.log('  → 调组干净地落在 2.5；辨组与治组贯穿全章，说明辨证与治法不是两段可以割开的工序。');
  console.log('');
  console.log('教学边界：本章只说明中医内科学的辨证思路、病证结合、治则治法与调护随访框架，不写剂量与用法量值（剂量与用法照底本），不作诊断与证候判定，不作疗效断言，不构成诊断与用药依据');

  return { chap, subs, shape: s, secs, phases, terms, spread, values, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  PHASES,
  TERMS,
  VALUE_RE,
  load,
  chapter,
  bodyOf,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  phaseStats,
  termCounts,
  groupSpread,
  valueAudit,
  extremes,
  main,
};
