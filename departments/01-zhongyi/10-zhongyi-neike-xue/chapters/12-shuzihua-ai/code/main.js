'use strict';
/**
 * 第 12 章 · 中医内科学的数字化与AI时代 —— 只做一件事：把「可枚举」与「可对齐」摆清楚
 *
 *   node code/main.js
 *
 * 数据：standards/neike/底本.json 第 12 章（qhzy-中医内科学.xlsx · 表「12 中医内科学的数字化与AI时代」）
 * 唯一来源，全部现算；docs/zh.md 里的每个数都是这里打印出来的。
 *
 * 本章与前十一章的区别：
 *   · 没有「辨证论治」，也没有「代表方：」——`pairs()` 在这一章返回空数组，这是**正确结果**，
 *     不是抽取失败。凡拿前十一章的抽取器套这一章，都会得到 0 条并误以为底本缺内容。
 *   · 可数的是另一批东西：证候要素（病位/病性）、编码（ICD-11 TM1、GB/T 16751.2）、
 *     三元组样例、平台分层、边界词（不得/不可/必须/以医者为准）。
 *   · 本章**不产生任何疗效断言，也不给临床决策**。代码只统计教材怎么描述这些工程对象，
 *     连「哪个系统更好」都不判断。
 *
 * 口径：
 *   · 节 = 4，每节 2 个小节，八个小节两两成对（标准—编码 / 图谱—推理 / 大模型—安全 / 单元—平台）。
 *   · 证候要素取 12.1.1 正文里的两串枚举，按「如…等」截断，不手抄名单。
 *   · 编码按正则取（两位章节号＋字母＋两位数字，如 8B20 / 7A00 / SA00），不硬编码具体码值。
 *   · 三元组按「（主语，谓语，宾语）」全角括号样板计数，只数样例个数，不判断其正确性。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neike/底本.json'), 'utf8'));
const NO = 12;

/** ICD-11 形态的编码：数字章节号或双字母段 + 两位数字，如 8B20 / 7A00 / SA00 / SE10 */
const CODE = /\b(?:[0-9][A-Z]|[A-Z]{2})[0-9]{2}\b/g;
/** 三元组样板：（A，B，C） */
const TRIPLE = /（[^（）]{1,24}，[^（）]{1,12}，[^（）]{1,24}）/g;
/** 边界词：教材自己划的线 */
const BOUNDARY = ['不得', '不可', '不能', '必须', '以医者为准', '可辅助参考', '溯源', '人工审核'];

function chap() {
  const c = BASE.chapters.find((x) => x.no === NO);
  if (!c) throw new Error(`底本里没有第 ${NO} 章`);
  return c;
}
const subs = () => chap().secs.flatMap((s) => s.subs.map((u) => ({ ...u, sec: s.no, secTitle: s.title })));

function shape() {
  const c = chap();
  return {
    no: c.no,
    title: c.title,
    secs: c.secs.length,
    subs: c.secs.reduce((n, s) => n + s.subs.length, 0),
    hanzi: c.counts.hanzi,
    valueLike: c.counts.valueLike,
    secTable: c.secs.map((s) => ({ no: s.no, title: s.title, subs: s.subs.map((u) => u.title) })),
  };
}

/** 八个小节两两成对：每节恰好 2 个小节 */
function pairing() {
  return chap().secs.map((s) => ({ no: s.no, title: s.title, n: s.subs.length, pair: s.subs.length === 2 }));
}

/** 本节没有辨证论治：可证伪的事实，不是缺失 */
function hasSyndromeSection() {
  return subs().some((u) => /辨证论治|证治/.test(u.title));
}

/** 证候要素：从 12.1.1 的两串枚举里切，不手抄 */
function elements() {
  const body = subs().find((u) => u.no === '12.1.1').items[0].body;
  const pick = (label) => {
    const m = new RegExp(`${label}如([^。]{2,120}?)等`).exec(body);
    if (!m) throw new Error(`12.1.1 里定位不到「${label}如…等」，原文可能已改`);
    return m[1].split('、').map((x) => x.replace(/（[^）]*）/g, '').trim()).filter(Boolean);
  };
  const position = pick('病位要素');
  const nature = pick('病性要素');
  return { position, nature, positionCount: position.length, natureCount: nature.length };
}

/** 编码：ICD-11 形态的码值，按出现顺序去重 */
function codes() {
  const text = subs().map((u) => u.items[0].body).join('\n');
  const all = text.match(CODE) || [];
  return { all, distinct: [...new Set(all)], n: all.length, distinctN: new Set(all).size };
}

/** 标准与互操作：按名称出现次数 */
function standards() {
  const text = subs().map((u) => u.items[0].body).join('\n');
  const words = ['ICD-11', 'TM1', 'GB/T 16751.2', 'GB/T 16751', 'WS/T 500', 'HL7 FHIR', 'RDF', 'Neo4j', 'LoRA', 'RAG', 'Transformer'];
  return words.map((w) => ({ w, n: (text.split(w).length - 1) })).filter((x) => x.n);
}

/** 三元组样板：只数个数与谓词，不判断对错 */
function triples() {
  const text = subs().map((u) => u.items[0].body).join('\n');
  const all = [...text.matchAll(TRIPLE)].map((m) => m[0]);
  const preds = all.map((t) => t.split('，')[1]).filter(Boolean);
  const freq = new Map();
  for (const p of preds) freq.set(p, (freq.get(p) || 0) + 1);
  return {
    n: all.length,
    samples: all.slice(0, 6),
    predicates: [...freq.entries()].map(([p, n]) => ({ p, n })),
  };
}

/** 平台分层：12.4.2 里的四层 */
function layers() {
  const body = subs().find((u) => u.no === '12.4.2').items[0].body;
  const names = ['基础设施层', '数据层', '服务层', '应用层'];
  return names.map((n) => ({ n, hit: body.includes(n) }));
}

/** 边界词计数：教材自己写的限制语 */
function boundaryWords() {
  const text = subs().map((u) => u.items[0].body).join('\n');
  return BOUNDARY.map((w) => ({ w, n: (text.split(w).length - 1) })).filter((x) => x.n);
}

/** 字数的两半分：八个小节各多少字，最长的与最短的 */
function spread() {
  const rows = subs().map((u) => ({ no: u.no, title: u.title, chars: u.items[0].body.length }));
  const sorted = [...rows].sort((a, b) => b.chars - a.chars);
  return { rows, max: sorted[0], min: sorted[sorted.length - 1], total: rows.reduce((n, r) => n + r.chars, 0) };
}

function totals() {
  const e = elements();
  return {
    ...shape(),
    pairs: 0,
    elements: e.positionCount + e.natureCount,
    codes: codes().n,
    codesDistinct: codes().distinctN,
    triples: triples().n,
    spread: spread().total,
  };
}

if (require.main === module) {
  const t = totals();
  console.log('');
  console.log('═══ 中医内科学 · 第 12 章 数字化与AI时代 ═══');
  console.log(`  底本：${t.title} · 节 ${t.secs} · 小节 ${t.subs} · ${t.hanzi} 汉字 · 量值 ${t.valueLike}`);
  console.log(`  证—方对 0 —— 本章没有辨证论治，也没有「代表方：」，0 是正确的`);
  console.log(`  证候要素 ${t.elements} 个 · 编码 ${t.codes} 处（去重 ${t.codesDistinct}）· 三元组样板 ${t.triples} 个`);

  console.log('\n── 四节八小节（两两成对）──');
  for (const p of pairing()) console.log(`  ${p.no} ${p.title}：${p.n} 小节${p.pair ? '（成对）' : ''}`);

  const e = elements();
  console.log('\n── 证候要素（12.1.1 原文切出）──');
  console.log(`  病位 ${e.positionCount}：${e.position.join('、')}`);
  console.log(`  病性 ${e.natureCount}：${e.nature.join('、')}`);

  const c = codes();
  console.log('\n── 编码（ICD-11 形态）──');
  console.log(`  出现 ${c.n} 次，去重 ${c.distinctN}：${c.distinct.join('、')}`);

  console.log('\n── 标准与工具名（出现次数）──');
  for (const s of standards()) console.log(`  ${s.w} × ${s.n}`);

  const tr = triples();
  console.log(`\n── 三元组样板：${tr.n} 个 ──`);
  for (const s of tr.samples) console.log(`  ${s}`);
  console.log(`  谓词：${tr.predicates.map((x) => `${x.p}×${x.n}`).join(' ')}`);

  console.log('\n── 平台四层 ──');
  for (const l of layers()) console.log(`  ${l.n}：${l.hit ? '有' : '无'}`);

  console.log('\n── 边界词（教材自带的限制语）──');
  for (const b of boundaryWords()) console.log(`  ${b.w} × ${b.n}`);

  const sp = spread();
  console.log('\n── 八小节字数 ──');
  for (const r of sp.rows) console.log(`  ${r.no} ${r.title}：${r.chars} 字`);
  console.log(`  合计 ${sp.total} 字 · 最长 ${sp.max.no}（${sp.max.chars}）· 最短 ${sp.min.no}（${sp.min.chars}）`);
  console.log('');
  console.log('  教学边界：本章输出为教材文本结构与术语计数，逐条可回查底本.json；不写疗效断言、不构成诊断与临床决策依据。');
}

module.exports = {
  BASE, NO, chap, subs, shape, pairing, hasSyndromeSection, elements, codes,
  standards, triples, layers, boundaryWords, spread, totals,
};
