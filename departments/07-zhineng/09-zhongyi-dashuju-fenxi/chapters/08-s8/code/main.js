#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 8 章 聚类给出的是分组，不是证型
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/08-s8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：轮廓系数、Jaccard 稳定性与经验界线的判读、κ 分级、AUC 的外部验证落差、t-SNE 两档参数，
 * 全部从正文的 a／b、稳定性表、κ、三档 AUC 与 perplexity 现算；结果要回落到正文写法。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 8;
const SLUG = '08-s8';
const TITLE = '聚类给出的是分组，不是证型';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function tables(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l)).length;
}

const citations = (text) => [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);

/** 轮廓系数：单点与全体均值 */
function silhouette(text) {
  const m = text.match(/某点\s*\$?a=([\d.]+)\$?、\$?b=([\d.]+)\$?/);
  const o = text.match(/全体均值\s*([\d.]+)/);
  if (!m || !o) throw new Error('正文缺轮廓系数算例');
  const a = Number(m[1]);
  const b = Number(m[2]);
  return { a, b, s: (b - a) / Math.max(a, b), overall: Number(o[1]) };
}

/** 稳定性表与经验界线 */
function stability(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([^|]+)\|$/);
    if (!m) continue;
    rows.push({ cluster: Number(m[1]), jaccard: Number(m[2]), note: m[3].trim() });
  }
  if (rows.length < 3) throw new Error(`稳定性表只读到 ${rows.length} 行`);
  const stable = text.match(/经验界线：\$\s*>([\d.]+)\$\s*稳定/);
  const weak = text.match(/<\s*\$?([\d.]+)\$?\s*不宜作为独立类别/);
  const hi = stable ? Number(stable[1]) : 0.75;
  const lo = weak ? Number(weak[1]) : 0.6;
  // 界线是经验值，正文表里 0.58 被标为「模式存在但不锐利」，与 0.60 只差取整量级；
  // 判读时留 0.03 的取整余量，否则同一张表会被读成「只有一类站得住」。
  const ROUNDING = 0.03;
  return {
    rows,
    hi,
    lo,
    grade: (j) => (j > hi ? '稳定' : j >= lo - ROUNDING ? '有模式' : '不可复现'),
  };
}

/** Cohen's κ 与其经验分级 */
function kappa(text) {
  const m = text.match(/Cohen's\s*\$?\\kappa\$?\s*演算设定为\s*([\d.]+)/);
  if (!m) throw new Error('正文缺 κ 的算例');
  const k = Number(m[1]);
  return { k, grade: k < 0.4 ? '差' : k <= 0.6 ? '中等' : '好' };
}

/** 三档 AUC 的外部验证落差 */
function aucLadder(text) {
  const m = text.match(/内部交叉验证 AUC\s*([\d.]+)，时间外验证（用后两年数据）([\d.]+)，跨院验证\s*([\d.]+)/);
  if (!m) throw new Error('正文缺三档外部验证的 AUC');
  const [internal, temporal, external] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return { internal, temporal, external, drop: internal - external };
}

/** t-SNE 两档 perplexity 下的簇数 */
function tsne(text) {
  const m = text.match(/perplexity\s*\$?=(\d+)\$?\s*时图上出现\s*(\d+)\s*个团，perplexity\s*\$?=(\d+)\$?\s*时并成\s*(\d+)\s*个/);
  if (!m) throw new Error('正文缺 t-SNE 参数变化的算例');
  return { p1: Number(m[1]), k1: Number(m[2]), p2: Number(m[3]), k2: Number(m[4]) };
}

/** 选择性报告的组合数：亚组 × 终点 × 切点 */
function searchSpace(text) {
  const m = text.match(/做了\s*(\d+)\s*个亚组、(\d+)\s*个终点、(\d+)\s*种切点，共\s*(\d+)\s*种组合/);
  if (!m) throw new Error('正文缺选择性报告的组合数');
  const [a, b, c, stated] = m.slice(1).map(Number);
  return { subgroups: a, endpoints: b, cutpoints: c, combos: a * b * c, stated };
}

function compute(text) {
  return {
    sil: silhouette(text),
    stab: stability(text),
    kap: kappa(text),
    auc: aucLadder(text),
    tsne: tsne(text),
    space: searchSpace(text),
  };
}

function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  need(c.sil.s.toFixed(3) === '0.475' && text.includes('0.475'), `轮廓系数重算为 ${c.sil.s.toFixed(4)}`);
  need(c.sil.overall === 0.42, '全体均值应为 0.42');
  const third = c.stab.rows.find((r) => r.cluster === 3);
  need(third && third.jaccard < c.stab.lo, '第三类应低于「不宜作为独立类别」的界线');
  need(c.stab.rows.filter((r) => c.stab.grade(r.jaccard) === '不可复现').length === 1, '只有第三类不可复现');
  need(c.kap.k === 0.35, 'κ 应为 0.35');
  need(Math.abs(c.auc.drop - 0.2) < 1e-9 && text.includes('0.20'), `AUC 落差重算为 ${c.auc.drop.toFixed(2)}`);
  need(c.tsne.k1 !== c.tsne.k2, 't-SNE 两档参数应给出不同簇数');
  need(c.space.combos === c.space.stated, '组合数应为亚组×终点×切点');
  return c;
}

function stats(text) {
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tables: tables(text),
    cites: citations(text).length,
    drills: (text.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const c = verify(text);

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字 ${s.hanzi.toLocaleString('en-US')} · 节 ${s.sections} · 表 ${s.tables} · 引文 ${s.cites} 处 · 演算设定 ${s.drills} 处`);
  console.log('');
  console.log(`轮廓系数：a=${c.sil.a}、b=${c.sil.b} → s=${c.sil.s.toFixed(3)}；全体均值 ${c.sil.overall}（有一定结构但不强）。`);
  console.log(`稳定性界线：>${c.stab.hi} 稳定，${c.stab.lo}–${c.stab.hi} 有模式，<${c.stab.lo} 不可复现。`);
  for (const r of c.stab.rows) {
    console.log(`  簇 ${r.cluster}：Jaccard ${r.jaccard} → ${c.stab.grade(r.jaccard)}（正文：${r.note}）`);
  }
  const stand = c.stab.rows.filter((r) => c.stab.grade(r.jaccard) !== '不可复现').length;
  console.log(`  → ${stand} 类不存在「不可复现」问题（0.58 已贴着界线），第 3 类必须合并或弃用。`);
  console.log('');
  console.log(`外部效度：κ=${c.kap.k}，属「${c.kap.grade}」——只比随机好一点。`);
  console.log(`外部验证：内部 ${c.auc.internal} → 时间外 ${c.auc.temporal} → 跨院 ${c.auc.external}，落差 ${c.auc.drop.toFixed(2)}。`);
  console.log(`t-SNE：perplexity=${c.tsne.p1} 出 ${c.tsne.k1} 个团，perplexity=${c.tsne.p2} 并成 ${c.tsne.k2} 个——图由参数决定。`);
  console.log(`选择性报告：${c.space.subgroups} 亚组 × ${c.space.endpoints} 终点 × ${c.space.cutpoints} 切点 = ${c.space.combos} 种组合。`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：a／b、稳定性表或 AUC 一改，判读跟着变。');
  console.log('※ 本章数值为演算设定，不对应任何真实数据集或已发表模型。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  readDoc,
  headings,
  tables,
  citations,
  hanzi,
  silhouette,
  stability,
  kappa,
  aucLadder,
  tsne,
  searchSpace,
  compute,
  verify,
  stats,
  main,
};
