#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 1 章：四诊本来就是多模态，缺的不是传感器而是时钟
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/01-u1/docs/zh.md
 * 取数: 直接解析本章正文的量纲表与增益表，不读任何外部统计文件
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字在运行时从正文现算：采样率跨度、冗余与互补的融合增益、边际收益递减。
 * 正文改一个数，这里跟着变；手打的数会在教材改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const nums = (s) =>
  (String(s).replace(/,/g, '').replace(/[−–]/g, '-').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
const num = (s) => {
  const v = nums(s);
  return v.length ? v[0] : null;
};

function parseDoc(text) {
  const lines = String(text).split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || '';
  const heading = titleLine.replace(/^#\s+/, '').trim();
  const chapterNo = Number((heading.match(/第\s*(\d+)\s*章/) || [])[1]) || null;
  const title = heading.replace(/^第\s*\d+\s*章\s*·?\s*/, '');
  const problem = (text.match(/\*\*PROBLEM:\*\*\s*([\s\S]*?)\r?\n\r?\n/) || [])[1] || '';
  const sections = lines.filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const tables = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) { cur = null; continue; }
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = []; tables.push(cur); }
    cur.push(cells);
  }
  const hanzi = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  return { text, title, chapterNo, problem, sections, tables, hanzi };
}

/** 「采样率（量级）」一列里，取本行最小的那个量级（区间取下限） */
function rateHz(cell) {
  const c = String(cell);
  const v = nums(c);
  if (!v.length) return null;
  const base = Math.min(...v.map(Math.abs));
  return /kHz/i.test(c) ? base * 1000 : base;
}

function modalityRates(doc) {
  const t = doc.tables.find((x) => x[0] && x[0].some((c) => c.includes('采样率')));
  if (!t) return {};
  const out = {};
  for (const r of t.slice(1)) out[r[0]] = { cell: r[3], hz: rateHz(r[3]) };
  return out;
}

function aucRows(doc) {
  const t = doc.tables.find((x) => x[0] && x[0].join('').includes('融合 AUROC'));
  if (!t) return [];
  return t
    .slice(1)
    .map((r) => ({ plan: r[0], singles: nums(r[1]), fusion: num(r[2]), stated: num(r[3]) }))
    .filter((r) => r.fusion != null && r.singles.length > 0)
    .map((r) => ({ ...r, derived: r.fusion - Math.max(...r.singles) }));
}

function analyze(doc) {
  const rates = modalityRates(doc);
  const voice = rates['闻'] && rates['闻'].hz;
  const interview = rates['问'] && rates['问'].hz;
  const span = voice && interview ? voice / interview : null;
  const auc = aucRows(doc);
  const gains = auc.map((r) => r.derived);
  const marginal = gains.slice(1).map((g, i) => g - gains[i]);
  return { rates, span, auc, gains, marginal };
}

const signed = (v) => (v >= 0 ? '+' : '') + v.toFixed(3);

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log('四路采样率（读自量纲表，区间取下限）：');
  for (const [k, v] of Object.entries(a.rates)) {
    console.log(`  ${k}：${v.hz} Hz  · 原始表述「${v.cell}」`);
  }
  console.log(`  → 跨度（闻 ÷ 问）：${a.span.toLocaleString('en-US')} 倍`);
  console.log('');
  console.log('融合增益（融合 AUROC − 该行最佳单模态，现算）：');
  for (const r of a.auc) {
    const ok = Math.abs(r.derived - r.stated) < 0.0015 ? '与正文标注一致' : `正文标注 ${r.stated}，不一致`;
    console.log(`  ${r.plan}：${signed(r.derived)}（${ok}）`);
  }
  console.log('');
  console.log(`边际收益：第二路 ${signed(a.marginal[0])}，第三路再 ${signed(a.marginal[1])}。`);
  console.log(`递减判据：${a.marginal[0] > a.marginal[1] ? '成立' : '不成立'} —— 每加一路都要问它值不值同步成本。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, modalityRates, aucRows, rateHz };
