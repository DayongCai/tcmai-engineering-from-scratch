#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 10 章：多源数据的红线，在合并之前就画好了
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/10-u10/docs/zh.md
 * 取数: 解析正文的准标识符叠加表与开篇的库规模
 * 依赖: 仅 Node.js 标准库
 *
 * 现算：每次叠加准标识符带来的唯一性增量、最大跳变在哪一步、等价类中位大小，
 * 以及给定库规模下可被唯一锁定的记录数。新增幅度都由相邻两行相减得出。
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

const nums = (s) => (String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

function identifierRows(doc) {
  const t = doc.tables.find((x) => x[0] && x[0].some((c) => c.includes('唯一记录占比')));
  if (!t) return [];
  return t.slice(1).map((r) => {
    const u = nums(r[1]);
    const k = nums(r[2]);
    return { combo: r[0], unique: u[0], medianClass: k[0] };
  });
}

function analyze(doc) {
  const rows = identifierRows(doc);
  const jumps = rows.slice(1).map((r, i) => r.unique - rows[i].unique);
  const maxJump = jumps.length ? Math.max(...jumps) : NaN;
  const maxJumpAt = jumps.length ? rows[jumps.indexOf(maxJump) + 1].combo : '';
  const poolM = doc.problem.match(/([\d,.]+)\s*(万)?人的库里/);
  const pool = poolM ? Number(poolM[1].replace(/,/g, '')) * (poolM[2] ? 10000 : 1) : NaN;
  const last = rows.length ? rows[rows.length - 1] : { unique: NaN, medianClass: NaN };
  return {
    rows, jumps, maxJump, maxJumpAt, pool,
    uniquePersons: Math.round((pool * last.unique) / 100),
    finalUnique: last.unique,
    finalMedian: last.medianClass,
    monotone: rows.every((r, i) => i === 0 || r.unique >= rows[i - 1].unique),
    medianShrinks: rows.every((r, i) => i === 0 || r.medianClass <= rows[i - 1].medianClass),
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log('准标识符叠加（读自正文表格）：');
  a.rows.forEach((r, i) => {
    const j = i === 0 ? '' : `  （+${a.jumps[i - 1]} 个百分点）`;
    console.log(`  ${r.combo}：唯一 ${r.unique}% · 等价类中位 ${r.medianClass}${j}`);
  });
  console.log(`  最大跳变：${a.maxJump} 个百分点，发生在「${a.maxJumpAt}」这一步。`);
  console.log('');
  console.log(`库规模 ${a.pool.toLocaleString('en-US')} 人 × ${a.finalUnique}% ≈ ${a.uniquePersons.toLocaleString('en-US')} 人可被唯一锁定。`);
  console.log(`单调性：唯一性${a.monotone ? '随叠加只升不降' : '不单调'}，等价类${a.medianShrinks ? '只缩不扩' : '有扩张'}。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出不构成法律意见、合规结论或监管建议。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, identifierRows };
