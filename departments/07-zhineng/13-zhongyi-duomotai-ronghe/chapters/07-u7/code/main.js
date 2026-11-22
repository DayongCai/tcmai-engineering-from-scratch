#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 7 章：聚类出来的亚型，先问它稳不稳
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/07-u7/docs/zh.md
 * 取数: 解析本章的方法对比表（ARI / 类别规模 / κ）与正文给出的稳定阈值
 * 依赖: 仅 Node.js 标准库
 *
 * 现算：各方法的 ARI 与 κ、稳定性阈值下的通过数、类别规模的极差比、
 * 从基线到最优的 ARI 提升。阈值从正文读，不写死。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function parseDoc(text) {
  const lines = String(text).split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || '';
  const heading = titleLine.replace(/^#\s+/, '').trim();
  const chapterNo = Number((heading.match(/第\s*(\d+)\s*章/) || [])[1]) || null;
  const title = heading.replace(/^第\s*\d+\s*章\s*·?\s*/, '');
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
  return { text, title, chapterNo, sections, tables, hanzi };
}

const nums = (s) => (String(s).match(/\d+(?:\.\d+)?/g) || []).map(Number);

function methodRows(doc) {
  const t = doc.tables.find((x) => x[0] && x[0].some((c) => c.includes('ARI')));
  if (!t) return [];
  return t.slice(1).map((r) => {
    const sizes = nums(r[2]);
    return {
      method: r[0],
      ari: Number(nums(r[1])[0]),
      sizes,
      spread: sizes.length ? Math.max(...sizes) / Math.min(...sizes) : NaN,
      kappa: Number(nums(r[3])[0]),
    };
  });
}

function analyze(doc) {
  const rows = methodRows(doc);
  const th = doc.text.match(/ARI 中位数 <\s*([\d.]+)\s*视为不稳定，<\s*([\d.]+)\s*视为不可用/);
  const unstable = th ? Number(th[1]) : NaN;
  const unusable = th ? Number(th[2]) : NaN;
  const pass = rows.filter((r) => r.ari >= unstable).length;
  const fail = rows.filter((r) => r.ari < unusable).length;
  const base = rows.length ? rows[0].ari : NaN;
  const best = rows.length ? Math.max(...rows.map((r) => r.ari)) : NaN;
  const bestKappa = rows.length ? Math.max(...rows.map((r) => r.kappa)) : NaN;
  return {
    rows, unstable, unusable, pass, fail,
    base, best,
    lift: best - base,
    kappaLift: bestKappa - (rows.length ? rows[0].kappa : NaN),
    bestMethod: rows.length ? rows.reduce((b, r) => (r.ari > b.ari ? r : b)).method : '',
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log('方法对比（读自正文表格）：');
  for (const r of a.rows) {
    const flag = r.ari >= a.unstable ? '过稳定阈' : r.ari < a.unusable ? '判不可用' : '不稳';
    console.log(`  ${r.method}：ARI ${r.ari} · κ ${r.kappa} · 类别规模极差 ${r.spread.toFixed(2)} 倍 · ${flag}`);
  }
  console.log('');
  console.log(`稳定阈 < ${a.unstable} 视为不稳定，< ${a.unusable} 视为不可用；通过 ${a.pass} / ${a.rows.length}，不可用 ${a.fail}。`);
  console.log(`最优方法：${a.bestMethod}；ARI 从 ${a.base} 提到 ${a.best}（+${a.lift.toFixed(2)}），κ 同步 +${a.kappaLift.toFixed(2)}。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 分型结果不得直接用于临床决策，本输出不构成证候分类标准。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, methodRows };
