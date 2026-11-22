#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 8 章：知识不是特征，是约束
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/08-u8/docs/zh.md
 * 取数: 解析正文的先验强度扫描表与覆盖/未覆盖类数
 * 依赖: 仅 Node.js 标准库
 *
 * 现算：最优 λ、覆盖类的收益、未覆盖类的损失、违反率先降后停的趋势、
 * 图谱的覆盖半径占比。全部由表格与正文数字推出，没有写死的结论。
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

function sweep(doc) {
  const t = doc.tables.find((x) => x[0] && x[0].some((c) => c.includes('未覆盖类')));
  if (!t) return [];
  return t.slice(1).map((r) => ({
    lambda: Number(nums(r[0])[0]),
    covered: Number(nums(r[1])[0]),
    uncovered: Number(nums(r[2])[0]),
    violation: Number(nums(r[3])[0]),
  }));
}

function analyze(doc) {
  const rows = sweep(doc);
  const best = rows.reduce((b, r) => (r.covered > b.covered ? r : b), rows[0]);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const radius = doc.text.match(/覆盖的\s*(\d+)\s*类上是\s*([\d.]+)，未覆盖的\s*(\d+)\s*类上从\s*([\d.]+)\s*掉到\s*([\d.]+)/);
  const coveredClasses = radius ? Number(radius[1]) : NaN;
  const uncoveredClasses = radius ? Number(radius[3]) : NaN;
  return {
    rows,
    best,
    coveredGain: best.covered - first.covered,
    uncoveredLoss: first.uncovered - best.uncovered,
    violationDrop: first.violation - last.violation,
    violationMonotone: rows.every((r, i) => i === 0 || r.violation <= rows[i - 1].violation),
    coveredClasses,
    uncoveredClasses,
    total: coveredClasses + uncoveredClasses,
    coverageShare: coveredClasses / (coveredClasses + uncoveredClasses),
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log('先验强度扫描（读自正文表格）：');
  for (const r of a.rows) {
    console.log(`  λ=${r.lambda}：覆盖类 ${r.covered} · 未覆盖类 ${r.uncovered} · 违反率 ${r.violation}%`);
  }
  console.log('');
  console.log(`覆盖类最优 λ=${a.best.lambda}；此时收益 +${a.coveredGain.toFixed(2)}，未覆盖类损失 −${a.uncoveredLoss.toFixed(2)}。`);
  console.log(`违反率 ${a.violationMonotone ? '随 λ 单调下降' : '并非单调下降'}，总降幅 ${a.violationDrop.toFixed(1)} 个百分点。`);
  console.log(`图谱覆盖 ${a.coveredClasses} 类 / 未覆盖 ${a.uncoveredClasses} 类 → 半径只罩住 ${(a.coverageShare * 100).toFixed(0)}% 的类别。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 知识图谱须经专家审定，本输出不构成辨证标准或诊疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, sweep };
