#!/usr/bin/env node
'use strict';
/**
 * 中药学 · 第 1 章 中药学的研究对象与性能：四气五味
 * 课程: departments/02-zhongyao/01-zhongyaoxue/chapters/01-xingneng-siqi/docs/zh.md
 * 出处: 教材·第5章 中药的性能（5 节 10 小节 20 段 2,126 字）
 * 依赖: 仅 Node.js 标准库 + 读 standards/zhongyao/ 的两份 JSON
 *
 * 本章量三件事：
 *   1. 五节是同构模板：每节 2 小节 × 2 段，字数极差只有几十字；
 *   2. 五要素的「术语热度」并不等于篇幅：五味 12 次、四气 3 次；
 *   3. 本章点名 50+ 味药、近百处，却一条药目也不载——总论是词表，不是数据库。
 *
 * 所有数字（节数/段数/字数/词频/举药）都在运行时现算，不写死；
 * 断言里钉死期望值，教材一改动就会报警。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');
const DRUGS = path.join(ROOT, 'standards', 'zhongyao', 'drugs.json');

const book = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const drugBook = JSON.parse(fs.readFileSync(DRUGS, 'utf8'));

const CH_NO = '5';
const ch = book.chapters.find((c) => String(c.no) === CH_NO);
const drugs = drugBook.drugs;

const paras = (s) => (s.paras || []).concat(...s.subs.map((u) => u.paras));
const secChars = (s) => paras(s).join('').length;
const secParas = (s) => (s.paras || []).length + s.subs.reduce((n, u) => n + u.paras.length, 0);
/** 千分位，仅用于打印。 */
const fmt = (n) => n.toLocaleString('en-US');

function sec(no) {
  return ch.secs.find((s) => s.no === no);
}

function sub(no) {
  for (const s of ch.secs) {
    const hit = (s.subs || []).find((x) => x.no === no);
    if (hit) return hit;
  }
  return undefined;
}

/** 某一小节正文的第 i 段（0 基）。教材原文核对用。 */
function para(no, i) {
  const s = sub(no);
  if (!s || !s.paras[i]) throw new Error(`教材里没有 ${no} 的第 ${i + 1} 段`);
  return s.paras[i];
}

/** 折叠空白与全半角标点，用于「引语能否逐字回查」的比对。 */
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』]/g, '');

/** 本章全文（小节正文按节顺序拼接）。 */
function text() {
  return ch.secs.map((s) => paras(s).join('')).join('');
}

/** 结构：逐节小节数/段数/字数/每段均字，以及五节的同构性与极差。 */
function shape() {
  const rows = ch.secs.map((s) => {
    const p = secParas(s);
    const c = secChars(s);
    return {
      no: s.no,
      title: s.title,
      subs: s.subs.length,
      paras: p,
      items: s.subs.reduce((n, u) => n + (u.items || []).length, 0),
      chars: c,
      perPara: +(c / p).toFixed(1),
    };
  });
  const total = rows.reduce((n, r) => n + r.chars, 0);
  const chars = rows.map((r) => r.chars);
  const max = Math.max(...chars);
  const min = Math.min(...chars);
  const subs = rows.map((r) => r.subs);
  const pr = rows.map((r) => r.paras);
  return {
    rows,
    total,
    share: total / book.counts.chars,
    secs: ch.counts.secs,
    subs: ch.counts.subs,
    paras: ch.counts.paras,
    items: ch.counts.items,
    max,
    min,
    spread: max - min,
    /** 逐节 2 小节 / 4 段，五节完全同构 */
    uniform: subs.every((n) => n === subs[0]) && pr.every((n) => n === pr[0]),
    perParaAvg: +(total / ch.counts.paras).toFixed(1),
  };
}

/** 词频：五要素术语 + 五味单字在本章出现多少次（现算，不查表）。 */
function lex() {
  const t = text();
  const count = (w) => t.split(w).length - 1;
  const ELEMENTS = ['四气', '五味', '升降浮沉', '归经', '毒性'];
  const TASTES = ['辛', '甘', '酸', '苦', '咸', '淡', '涩'];
  const elements = ELEMENTS.map((w) => ({ word: w, n: count(w) })).sort((a, b) => b.n - a.n);
  return {
    elements,
    tastes: TASTES.map((w) => ({ word: w, n: count(w) })),
    /** 术语最多 / 最少的两项，用来对照篇幅 */
    most: elements[0],
    least: elements[elements.length - 1],
    /** 每千字出现次数 */
    density: +(elements.reduce((n, x) => n + x.n, 0) / (t.length / 1000)).toFixed(1),
  };
}

/** 举药：本章正文提到了哪些药、提了几处，以及本章立了几条药目。 */
function mentions() {
  const t = text();
  const names = [...new Set(drugs.map((d) => d.name))];
  const hit = names.filter((n) => t.includes(n));
  const places = hit.reduce((n, x) => n + (t.split(x).length - 1), 0);
  const inCh = drugs.filter((d) => String(d.chapter) === CH_NO);
  return {
    names: hit,
    distinct: hit.length,
    places,
    records: inCh.length,
    bookRecords: drugs.length,
    /** 举例处数 ÷ 药目条数：0 说明本章只有引用、没有立目 */
    recordRate: inCh.length / drugs.length,
  };
}

function citation(no) {
  return `教材·第${CH_NO}章·${no}`;
}

/** 引用是否落得到教材节点上：5.1 / 5.1.2 / 5.1.2.1 三级。 */
function resolve(no) {
  const parts = String(no).split('.');
  if (parts.length === 2) return ch.secs.some((s) => s.no === no);
  if (parts.length === 3) return Boolean(sub(no));
  const parent = sub(parts.slice(0, 3).join('.'));
  return Boolean(parent && (parent.items || []).some((i) => i.no === no));
}

function main() {
  const s = shape();
  const l = lex();
  const m = mentions();

  console.log(`═══ 中药的性能（教材·第${CH_NO}章）═══`);
  for (const r of s.rows) {
    console.log(`  ${r.no} ${r.title}：${r.subs} 小节 · ${r.paras} 段 · ${r.chars} 字 · 每段 ${r.perPara} 字`);
  }
  console.log(`  合计 ${s.secs} 节 ${s.subs} 小节 ${s.paras} 段 ${s.items} 段标题 ${fmt(s.total)} 字，占全书 ${fmt(book.counts.chars)} 字的 ${(s.share * 100).toFixed(2)}%`);
  console.log(`  五节结构同构：${s.uniform ? `是（每节 ${s.rows[0].subs} 小节 / ${s.rows[0].paras} 段）` : '否'}；字数极差 ${s.spread} 字（${s.min}–${s.max}），每段均字 ${s.perParaAvg}`);
  console.log('');

  console.log('═══ 术语热度 ≠ 篇幅（教材·第5章 全章词频）═══');
  console.log('  ' + l.elements.map((x) => `${x.word} ${x.n}`).join(' · '));
  console.log(`  → 最多「${l.most.word}」${l.most.n} 次，最少「${l.least.word}」${l.least.n} 次；五要素合计 ${l.elements.reduce((n, x) => n + x.n, 0)} 次，密度 ${l.density} 次/千字`);
  console.log('  五味单字：' + l.tastes.map((x) => `${x.word}${x.n}`).join(' '));
  console.log('');

  console.log(`═══ 举药 ${m.places} 处，立目 ${m.records} 条（教材·第${CH_NO}章 与 drugs 层对照）═══`);
  console.log(`  本章点名的药：${m.distinct} 味、共 ${m.places} 处`);
  console.log(`  本章立目：${m.records} 条；全书药目 ${m.bookRecords} 味 → 本章占 ${(m.recordRate * 100).toFixed(1)}%`);
  console.log(`  示例：${m.names.slice(0, 12).join('、')}…（全部为举例，无性味归经字段）`);
  console.log('  结论：总论给的是词表与判据，逐药数据要到各论（教材·第9章起）才有。');
  console.log('');

  console.log('═══ 五要素的判据句（教材·第5章·5.1–5.5）═══');
  const anchors = [
    ['5.1.1', '四气（四性）'],
    ['5.2.1', '辛能散能行'],
    ['5.3.1', '升降浮沉指药物作用的四种趋向'],
    ['5.4.1', '归经指药物作用部位的归属'],
    ['5.5.1', '广义毒性指药物的偏性'],
  ];
  for (const [no, head] of anchors) {
    const hit = sub(no).paras.find((p) => p.includes(head));
    const at = hit ? hit.indexOf(head) : -1;
    console.log(`  ${citation(no)}  ${hit ? '「' + hit.slice(at, at + 30) + '…」' : '未命中「' + head + '」'}`);
  }
  console.log('教学边界：本章只清点总论五节的篇幅、词频与举例，不据此辨证、不给处方、不做剂量推算；不构成用药依据。');
}

if (require.main === module) main();

module.exports = {
  book, drugBook, ch, drugs, CH_NO,
  sec, sub, para, paras, secChars, secParas, text, fold,
  shape, lex, mentions, citation, resolve,
};
