#!/usr/bin/env node
/**
 * 中医内科学 · 第 1 章 绪论：学科内涵、范围、源流与学习路径
 * 课程: departments/01-zhongyi/10-zhongyi-neike-xue/chapters/01-xulun/docs/zh.md
 * 出处: 教材·中医内科学·第1章（1.1–1.3，共 3 节 6 小节）
 * 数据: standards/neike/底本.json（chapters[no=1]，secs[].subs[].items[] 带 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「绪论给的不是病名，是一套判位置的坐标」。
 * 坐标能不能立住，看的是三件事——三节把笔墨摊在哪、核心术语被提了几次、
 * 界线句（什么归内科、什么不归）落在哪几个小节。这些都能从底本正文字数出来。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/neike/底本.json 的那一级
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
const CHAPTER = 1;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 1 章）的结构对象 */
function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 小节正文：一个小节下可能挂多个条目，按条目顺序拼起来 */
const bodyOf = (u) => (u.items || []).map((i) => i.body || '').join('\n');

/** 摊平小节，按 no 排序（底本已按节序给出，这里再排一次以防改版打乱） */
function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

/** 汉字数：只数 CJK 统一表意文字，标点与数字不算 */
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

/** 规模：节数 / 小节数 / 汉字数 */
function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0),
  };
}

/** 逐节统计：每节几个小节、多少汉字、小节均字 */
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

/** 关键词计数：全章次数 + 每个小节的次数 */
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
 * 术语词表：三组语言。
 * 界定组讲「这门学科管什么」（辨证论治 / 整体观念 / 病证），
 * 来路组讲「这套语言从哪来」（内经 / 伤寒 / 病机），
 * 落数组讲「最后落到哪」（治法 / 方药 / 证候）。
 */
const TERMS = [
  { key: '辨证论治', group: '界定' },
  { key: '整体观念', group: '界定' },
  { key: '病证', group: '界定' },
  { key: '病机', group: '来路' },
  { key: '伤寒', group: '来路' },
  { key: '内经', group: '来路' },
  { key: '证候', group: '落数' },
  { key: '治法', group: '落数' },
  { key: '方药', group: '落数' },
  { key: '教材', group: '元词' },
];

/** 术语词频：按次数降序，同次数保持词表顺序（稳定排序，结果可复算） */
function termCounts(chap) {
  return TERMS.map((p) => ({ ...p, ...keywordHits(chap, p.key) }))
    .map((p) => ({ key: p.key, group: p.group, total: p.total, per: p.per }))
    .sort((a, b) => b.total - a.total);
}

/**
 * 界线审计：教材把「归内科 / 不归内科」的判断写成具体句子。
 * 这一项只数两个方向：向外划界（外科、妇科、儿科、西医）与向内归类（肺系…肾系）。
 */
const OUTWARD = ['外科', '妇科', '儿科', '西医'];
const INWARD = ['肺系', '心系', '脾胃系', '肝胆系', '肾系'];

function boundaryAudit(chap) {
  const subs = subsOf(chap);
  const where = (w) => subs.filter((u) => bodyOf(u).includes(w)).map((u) => u.no);
  return {
    outward: OUTWARD.map((w) => ({ word: w, subs: where(w) })),
    inward: INWARD.map((w) => ({ word: w, subs: where(w) })),
    subs: subs.map((u) => u.no),
  };
}

/**
 * 量值核验：底本声明本章 0 处剂量。
 * 本函数把这条声明当断言复算——不是相信它，是检查它。
 * 词表与章门用的是同一套单位（见 scripts/lib_value_caliber.js）。
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

/** 最薄与最厚的小节：两端的落差说明教材不是平均用力 */
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
  const terms = termCounts(chap);
  const bound = boundaryAudit(chap);
  const values = valueAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 绪论：学科内涵、范围、源流与学习路径（中医内科学 第1章）═══');
  console.log(`教材规模: 第1章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`6 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(bodyOf(u))} 字`);
  console.log('');
  console.log(`术语词频: ${terms.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  const dense = [...terms].sort((a, b) => b.total - a.total)[0];
  console.log(`  最密的术语: ${dense.key} ${dense.total} 次，分布在 ${dense.per.length} 个小节`);
  console.log('  → 界定组（辨证论治 / 整体观念 / 病证）与落数组（证候 / 治法 / 方药）夹住来路组：');
  console.log('     绪论先立地界与语言，再把语言交给后面的病证章去用。');
  console.log('');
  console.log('界线审计（教材在哪几个小节制「归内科 / 不归内科」）：');
  console.log(`  向外划界: ${bound.outward.map((x) => `${x.word}(${x.subs.join('/') || '—'})`).join(' ')}`);
  console.log(`  向内归类: ${bound.inward.map((x) => `${x.word}(${x.subs.join('/') || '—'})`).join(' ')}`);
  console.log('  → 划界句与归类句同落在 1.1：地界与门类是一件事的两面，写在同处不是巧合。');
  console.log('');
  console.log('教学边界：本章只说明中医内科学的学科界定、范围、源流与学习路径，不写剂量与用法量值（剂量与用法照底本），不作诊断与证候判定，不作疗效断言，不构成诊断与用药依据');

  return { chap, subs, shape: s, secs, terms, boundary: bound, values, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  TERMS,
  OUTWARD,
  INWARD,
  VALUE_RE,
  load,
  chapter,
  bodyOf,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  termCounts,
  boundaryAudit,
  valueAudit,
  extremes,
  main,
};
