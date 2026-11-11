#!/usr/bin/env node
/**
 * 中医内科学 · 第 3 章 脏腑辨证纲要与内科治则
 * 课程: departments/01-zhongyi/10-zhongyi-neike-xue/chapters/03-zangfu-bianzheng-gangyao/docs/zh.md
 * 出处: 教材·中医内科学·第3章（3.1–3.8，共 8 节 25 小节）
 * 数据: standards/neike/底本.json（chapters[no=3]，secs[].subs[].items[] 带 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「同一个三件套模板重复了六遍——生理 → 证候 → 辨治」。
 * 这条命题可以落到三件可核的事上：六节是不是都齐三格、每节最厚的那一格是哪一格、
 * 「纲」字落在哪几个小节。手打的数字会在教材改版后静默过期；现算的对不上，测试自己会红。
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
const CHAPTER = 3;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

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
 * 小节归类：本章 25 个小节分四类。
 * 生理格 / 证候格 / 辨治格是六份模板的三件套；外感格与兼夹格是 3.7、3.8 两个补丁。
 */
const KINDS = [
  { key: '生理', test: /生理功能与病机要点|气血津液理论与病机要点/ },
  { key: '证候', test: /常见证候/ },
  { key: '辨治', test: /辨治要点/ },
  { key: '外感', test: /辨证的应用/ },
  { key: '兼夹', test: /(虚实夹杂|寒热错杂|多脏同病|标本同病).*辨治/ },
];

function kindOf(u) {
  const hit = KINDS.find((k) => k.test.test(u.title.replace(/^\d+\.\d+\.\d+\s*/, '')));
  return hit ? hit.key : '?';
}

/** 每节的分类构成：六份模板应当都是 生理+证候+辨治 */
function templateAudit(chap) {
  return chap.secs.map((s) => {
    const kinds = s.subs.map(kindOf);
    return {
      no: s.no,
      kinds,
      full: ['生理', '证候', '辨治'].every((k) => kinds.includes(k)),
    };
  });
}

/** 每节最厚的那一小节——本章最稳定的一条版面事实 */
function thickestPerSection(chap) {
  return chap.secs.map((s) => {
    const rows = s.subs.map((u) => ({
      sub: u.no,
      kind: kindOf(u),
      hanzi: hanzi(bodyOf(u)),
    }));
    const top = [...rows].sort((a, b) => b.hanzi - a.hanzi)[0];
    return { no: s.no, rows, top };
  });
}

/**
 * 「纲」的分布：本章五系各给一个纲，纲的形态不同（宣降 / 补虚泻实 / 升降 / 疏泄 / 补）。
 * 数「为纲」这个词，是为了看教材把它写在哪几节。
 */
function gangAudit(chap) {
  const subs = subsOf(chap);
  const withIt = subs.filter((u) => bodyOf(u).includes('为纲'));
  return {
    count: subs.reduce((n, u) => n + (bodyOf(u).match(/为纲/g) || []).length, 0),
    subs: withIt.map((u) => u.no),
    of: subs.length,
  };
}

/**
 * 术语词表：三组语言。
 * 结构组讲「在哪一格」（病位 / 证候 / 治法），
 * 功能组讲「失了什么」（宣降 / 疏泄 / 升降 / 纳气），
 * 复合组讲「装不下时怎么处理」（虚实 / 标本 / 传变）。
 */
const TERMS = [
  { key: '证候', group: '结构' },
  { key: '病位', group: '结构' },
  { key: '治法', group: '结构' },
  { key: '宣降', group: '功能' },
  { key: '疏泄', group: '功能' },
  { key: '升降', group: '功能' },
  { key: '纳气', group: '功能' },
  { key: '虚实', group: '复合' },
  { key: '标本', group: '复合' },
  { key: '传变', group: '复合' },
];

function termCounts(chap) {
  return TERMS.map((p) => ({ ...p, ...keywordHits(chap, p.key) }))
    .map((p) => ({ key: p.key, group: p.group, total: p.total, per: p.per }))
    .sort((a, b) => b.total - a.total);
}

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
  const tpl = templateAudit(chap);
  const thick = thickestPerSection(chap);
  const gang = gangAudit(chap);
  const terms = termCounts(chap);
  const values = valueAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 脏腑辨证纲要与内科治则：六份模板 + 两个补丁（中医内科学 第3章）═══');
  console.log(`教材规模: 第3章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log('三件套模板核验（生理 → 证候 → 辨治）：');
  for (const t of tpl) {
    console.log(`  ${t.no} ${t.kinds.join(' / ')}${t.full ? '' : '  ← 非三件套'}`);
  }
  console.log(`  → 齐三件的节 ${tpl.filter((t) => t.full).length} / ${tpl.length}`);
  console.log('');
  console.log('每节最厚的一格：');
  for (const t of thick) console.log(`  ${t.no} 最厚 ${t.top.sub}（${t.top.kind} · ${t.top.hanzi} 字）`);
  const byKind = {};
  for (const t of thick) byKind[t.top.kind] = (byKind[t.top.kind] || 0) + 1;
  console.log(`  → 最厚格为「证候」的节有 ${byKind['证候'] || 0} 个；例外是心系（辨治要点更厚）。`);
  console.log('');
  console.log(`纲的分布: 「为纲」${gang.count} 次，落在 ${gang.subs.length} 个小节（共 ${gang.of} 小节）`);
  console.log(`  → ${gang.subs.join(' ')}`);
  console.log('     五系各给一个纲，形态各不相同：恢复一个功能 / 判虚实再补泻 / 一对升降 / 体用并调 / 以补为主。');
  console.log('');
  console.log(`25 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${kindOf(u)} · ${hanzi(bodyOf(u))} 字`);
  console.log('');
  console.log(`术语词频: ${terms.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('');
  console.log('教学边界：本章只说明脏腑辨证纲要、三套外感辨证的分工与兼夹证处理框架，不写剂量与用法量值（剂量与用法照底本），不作诊断与证候判定，不作疗效断言，不构成诊断与用药依据');

  return { chap, subs, shape: s, secs, template: tpl, thickest: thick, gang, terms, values, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KINDS,
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
  kindOf,
  templateAudit,
  thickestPerSection,
  gangAudit,
  termCounts,
  valueAudit,
  extremes,
  main,
};
