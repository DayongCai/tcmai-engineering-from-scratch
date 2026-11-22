#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 4 章 三个检验的名字，不如它们假设的四句话
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/04-s4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：t 值、χ²、Cramér's V、效应量，以及辛普森悖论那张分层表的合并率与 MH 合并 OR，
 * 全部从正文的分层表与例数现算；重算结果要回落到正文写法，对不上就抛错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const SLUG = '04-s4';
const TITLE = '三个检验的名字，不如它们假设的四句话';
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

/** 辛普森悖论的分层表：每层甲／乙的例数与率 */
function simpson(text) {
  const rows = [...text.matchAll(
    /\|\s*(轻证|重证)\s*\|\s*(\d+)\/(\d+)\s*=\s*\*\*([\d.]+)%\*\*\s*\|\s*(\d+)\/(\d+)\s*=\s*\*\*([\d.]+)%\*\*\s*\|/g,
  )].map((m) => ({
    layer: m[1],
    a: Number(m[2]),
    nA: Number(m[3]),
    rateA: Number(m[4]),
    c: Number(m[5]),
    nB: Number(m[6]),
    rateB: Number(m[7]),
  }));
  if (rows.length !== 2) throw new Error(`分层表只读到 ${rows.length} 行，应为 2 行`);
  const sumA = rows.reduce((s, r) => s + r.a, 0);
  const sumNA = rows.reduce((s, r) => s + r.nA, 0);
  const sumC = rows.reduce((s, r) => s + r.c, 0);
  const sumNB = rows.reduce((s, r) => s + r.nB, 0);
  return { rows, pooledA: sumA / sumNA, pooledB: sumC / sumNB, nA: sumNA, nB: sumNB };
}

/** Mantel-Haenszel 合并 OR：按层内信息量加权 */
function mantelHaenszel(rows) {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const b = r.nA - r.a;
    const d = r.nB - r.c;
    const n = r.nA + r.nB;
    num += (r.a * d) / n;
    den += (b * r.c) / n;
  }
  return { num, den, or: num / den };
}

/** 两样本 t 与效应量换算 */
function tTest(text) {
  const m = text.match(/均值差\s*([\d.]+)\s*分，合并标准差\s*([\d.]+)/);
  const n = text.match(/两组各\s*(\d+)\s*例/);
  if (!m || !n) throw new Error('正文缺 t 检验算例');
  const diff = Number(m[1]);
  const sp = Number(m[2]);
  const per = Number(n[1]);
  const t = diff / (sp * Math.sqrt(2 / per));
  const df = 2 * per - 2;
  return { diff, sp, per, t, df, d: t * Math.sqrt(2 / per), r: Math.sqrt((t * t) / (t * t + df)) };
}

/** 2×2 卡方与 Cramér's V */
function chiSquare(text) {
  const m = text.match(/甲\s*(\d+)\/(\d+)\s*有效、乙\s*(\d+)\/(\d+)\s*有效/);
  if (!m) throw new Error('正文缺两组有效例数');
  const a = Number(m[1]);
  const n1 = Number(m[2]);
  const c = Number(m[3]);
  const n2 = Number(m[4]);
  const b = n1 - a;
  const d = n2 - c;
  const n = n1 + n2;
  const r1 = n1;
  const r2 = n2;
  const c1 = a + c;
  const c2 = b + d;
  const cells = [
    [a, (r1 * c1) / n],
    [b, (r1 * c2) / n],
    [c, (r2 * c1) / n],
    [d, (r2 * c2) / n],
  ];
  const chi2 = cells.reduce((s, [o, e]) => s + ((o - e) ** 2) / e, 0);
  const minE = Math.min(...cells.map(([, e]) => e));
  return { a, b, c, d, n, chi2, minE, v: Math.sqrt(chi2 / (n * (2 - 1))) };
}

/** 亚组／多组比较的族错误率表 */
function fwerTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)%\s*\|$/);
    if (!m) continue;
    const groups = Number(m[1]);
    const k = Number(m[2]);
    rows.push({ groups, k, stated: Number(m[3]), calc: 1 - 0.95 ** k, expectedK: (groups * (groups - 1)) / 2 });
  }
  if (rows.length < 3) throw new Error(`族错误率表只读到 ${rows.length} 行`);
  return rows;
}

function compute(text) {
  const sp = simpson(text);
  return {
    simpson: sp,
    mh: mantelHaenszel(sp.rows),
    t: tTest(text),
    chi: chiSquare(text),
    fwer: fwerTable(text),
  };
}

function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const pct = (x) => (x * 100).toFixed(1);
  for (const r of c.simpson.rows) {
    need(pct(r.a / r.nA) === r.rateA.toFixed(1), `${r.layer}层甲组率与表内写法不一致`);
    need(pct(r.c / r.nB) === r.rateB.toFixed(1), `${r.layer}层乙组率与表内写法不一致`);
  }
  need(text.includes(pct(c.simpson.pooledA)) && text.includes(pct(c.simpson.pooledB)), '合并率未回落到正文');
  need(c.mh.or.toFixed(2) === '0.83' && text.includes('0.83'), `MH 合并 OR 重算为 ${c.mh.or.toFixed(4)}，正文写 0.83`);
  need(c.simpson.pooledA > c.simpson.pooledB, '合并方向上甲应高于乙（方向被权重扭反）');
  need(c.simpson.rows.every((r) => r.rateB > r.rateA), '分层内乙应逐层更高');
  need(c.t.t.toFixed(2) === '2.35' && text.includes('2.35'), `t 重算为 ${c.t.t.toFixed(2)}，正文写 2.35`);
  need(c.chi.chi2.toFixed(2) === '2.65' && text.includes('2.65'), `χ² 重算为 ${c.chi.chi2.toFixed(2)}，正文写 2.65`);
  need(c.chi.v.toFixed(2) === '0.18' && text.includes('0.18'), `Cramér's V 重算为 ${c.chi.v.toFixed(2)}，正文写 0.18`);
  need(c.t.d.toFixed(2) === '0.53' && text.includes('0.53'), `Cohen's d 重算为 ${c.t.d.toFixed(2)}，正文写 0.53`);
  need(c.t.r.toFixed(2) === '0.26' && text.includes('0.26'), `r 重算为 ${c.t.r.toFixed(2)}，正文写 0.26`);
  for (const row of c.fwer) {
    need(row.k === row.expectedK, `${row.groups} 组的比较次数应为 C(n,2)=${row.expectedK}`);
    need(Math.abs(row.calc * 100 - row.stated) < 0.15, `${row.groups} 组族错误率重算 ${(row.calc * 100).toFixed(1)}%，表内写 ${row.stated}%`);
  }
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
  const pct = (x) => `${(x * 100).toFixed(1)}%`;

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字 ${s.hanzi.toLocaleString('en-US')} · 节 ${s.sections} · 表 ${s.tables} · 引文 ${s.cites} 处 · 演算设定 ${s.drills} 处`);
  console.log('');
  console.log('辛普森悖论分层表：');
  for (const r of c.simpson.rows) {
    console.log(`  ${r.layer}  甲 ${r.a}/${r.nA}=${pct(r.a / r.nA)}   乙 ${r.c}/${r.nB}=${pct(r.c / r.nB)}`);
  }
  console.log(`  合计    甲 ${pct(c.simpson.pooledA)}   乙 ${pct(c.simpson.pooledB)}（方向被权重扭反）`);
  console.log(`  MH：Σad/n=${c.mh.num.toFixed(2)}，Σbc/n=${c.mh.den.toFixed(2)}，OR_MH=${c.mh.or.toFixed(3)}`);
  console.log('');
  console.log(`t：差值 ${c.t.diff}，s_p=${c.t.sp}，每组 ${c.t.per} 例 → t=${c.t.t.toFixed(2)}，df=${c.t.df}，d=${c.t.d.toFixed(2)}，r=${c.t.r.toFixed(2)}。`);
  console.log(`χ²：${c.chi.a}/${c.chi.a + c.chi.b} 对 ${c.chi.c}/${c.chi.c + c.chi.d} → χ²=${c.chi.chi2.toFixed(2)}，最小期望频数 ${c.chi.minE.toFixed(1)}，V=${c.chi.v.toFixed(2)}。`);
  console.log('');
  console.log('族错误率（按比较次数现算）：');
  for (const r of c.fwer) {
    console.log(`  ${r.groups} 组 · k=${r.k} · ${(r.calc * 100).toFixed(1)}%（表内 ${r.stated}%）`);
  }
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：分层表或例数一改，合并率、MH OR、χ² 与 V 跟着变。');
  console.log('※ 本章数值为演算设定，用于演示检验与合并的机制，不对应任何真实研究。');
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
  simpson,
  mantelHaenszel,
  compute,
  verify,
  stats,
  main,
};
