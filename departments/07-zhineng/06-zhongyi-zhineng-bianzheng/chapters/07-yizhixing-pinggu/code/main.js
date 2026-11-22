#!/usr/bin/env node
/**
 * 第 7 章 · 一致性体检：把正文那两个例子的混淆矩阵还原出来，再重算 p_o / p_e / κ
 *
 *   数据: chapters/07-yizhixing-pinggu/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 正文给了两个例子：
 *   均衡例：100 例，双方都判甲 40、都判乙 40、各错一边 10 —— 报 p_o 0.8、p_e 0.5、κ 0.6
 *   极偏例：医生判甲 90、乙 10，系统一律判甲 —— 报 p_o 0.9、p_e 0.9、κ 0
 * 这里从正文句子取数、还原矩阵、重算三个量，再看正文的 κ 表是否与重算一致。
 * 不评估任何系统，只核对口径。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const loadDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(md) {
  const out = [{ heading: '（章首）', body: [] }];
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s+/.test(line)) out.push({ heading: line.replace(/^##\s+/, '').trim(), body: [] });
    else out[out.length - 1].body.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
}

function tables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (!/^\s*\|.*\|\s*$/.test(line)) { cur = null; continue; }
    if (/^[\s:|-]+$/.test(line.replace(/\|/g, ''))) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); continue; }
    cur.rows.push(cells);
  }
  return out;
}

/** p_o / p_e / κ 的口径；PABAK = 2p_o − 1，对偏分布不敏感 */
function stats(matrix) {
  const n = matrix.flat().reduce((a, b) => a + b, 0);
  if (!n) throw new Error('混淆矩阵为空');
  const k = matrix.length;
  for (const row of matrix) if (row.length !== k) throw new Error('混淆矩阵必须是方阵');
  const diag = matrix.reduce((s, row, i) => s + row[i], 0);
  const po = diag / n;
  const rowSum = matrix.map((r) => r.reduce((a, b) => a + b, 0) / n);
  const colSum = matrix[0].map((_, j) => matrix.reduce((s, r) => s + r[j], 0) / n);
  const pe = rowSum.reduce((s, r, i) => s + r * colSum[i], 0);
  return {
    n,
    po,
    pe,
    kappa: pe === 1 ? null : (po - pe) / (1 - pe),
    pabak: 2 * po - 1,
  };
}

/** 从正文句子还原两个 2×2 混淆矩阵 */
function proseMatrices(md) {
  const s2 = sections(md).find((s) => /kappa 扣掉了什么/.test(s.heading));
  const body = s2 ? s2.body : '';
  const out = [];
  const bal = body.match(/(\d+)\s*例双方都判甲、\s*(\d+)\s*例都判乙，\s*(\d+)\s*例各错一边/);
  if (bal) {
    const [bothA, bothB, oneSide] = [Number(bal[1]), Number(bal[2]), Number(bal[3])];
    out.push({ name: '均衡例', matrix: [[bothA, oneSide], [oneSide, bothB]] });
  }
  const skew = body.match(/医生判甲\s*(\d+)\s*例、乙\s*(\d+)\s*例；系统一律判甲/);
  if (skew) {
    const [docA, docB] = [Number(skew[1]), Number(skew[2])];
    out.push({ name: '极偏例', matrix: [[docA, docB], [0, 0]] });
  }
  return out;
}

/** 正文的 κ 表：p_o / p_e / κ 三列 */
function kappaTable(md) {
  const t = tables(md).find((x) => x.header.includes('p_o') && x.header.includes('p_e'));
  if (!t) return [];
  return t.rows.map((r) => ({
    name: r[0],
    po: Number(r[1]),
    pe: Number(r[2]),
    kappa: Number(r[3]),
  }));
}

function audit(md = loadDoc()) {
  const secs = sections(md);
  const matrices = proseMatrices(md).map((x) => ({ ...x, stats: stats(x.matrix) }));
  const table = kappaTable(md);
  const tableCheck = table.map((row) => {
    const recomputed = (row.po - row.pe) / (1 - row.pe);
    return { ...row, recomputed: +recomputed.toFixed(3), agrees: Math.abs(recomputed - row.kappa) < 1e-9 };
  });

  // 边际敏感：同一个 p_o，换一个 p_e，κ 差多少（正文的 kappa 悖论）
  const poFixed = 0.9;
  const kappaAt = (pe) => (poFixed - pe) / (1 - pe);
  const sensitivity = { po: poFixed, pe05: +kappaAt(0.5).toFixed(3), pe09: +kappaAt(0.9).toFixed(3) };

  const missing = [];
  if (matrices.length !== 2) missing.push(`正文只还原出 ${matrices.length} 个例子`);
  if (table.length < 2) missing.push('κ 表缺行');
  if (tableCheck.some((r) => !r.agrees)) missing.push('κ 表里有对不上 (p_o − p_e)/(1 − p_e) 的行');
  for (const m of matrices) {
    if (!(m.stats.po >= 0 && m.stats.po <= 1)) missing.push(`${m.name} 的 p_o 越界`);
  }
  if (!/一致性研究只能支持/.test(md)) missing.push('未写明一致性研究只能支持可替代');
  if (!/PABAK/.test(md)) missing.push('缺替代指标 PABAK');

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    matrices,
    table: tableCheck,
    sensitivity,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  for (const m of a.matrices) {
    console.log(`${m.name}（还原矩阵 ${JSON.stringify(m.matrix)}，n=${m.stats.n}）`);
    console.log(`  p_o=${m.stats.po.toFixed(3)}  p_e=${m.stats.pe.toFixed(3)}  κ=${m.stats.kappa === null ? '—' : m.stats.kappa.toFixed(3)}  PABAK=${m.stats.pabak.toFixed(3)}`);
  }
  console.log('');
  console.log('正文 κ 表逐行核对：');
  for (const r of a.table) {
    console.log(`  ${r.name}：报 κ=${r.kappa}，重算 ${r.recomputed} → ${r.agrees ? '一致' : '不一致'}`);
  }
  console.log('');
  console.log(`kappa 悖论：p_o 固定为 ${a.sensitivity.po}，p_e 从 0.5 换到 0.9，κ 从 ${a.sensitivity.pe05} 掉到 ${a.sensitivity.pe09}。`);
  console.log('  → 同样的判断能力，换个类别分布就换个结论，所以 p_o、κ、边际分布必须一起报。');
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：两个例子的口径与正文一致，悖论可复算。');
  console.log('');
  console.log('※ 以上矩阵来自本章正文的举例，不是任何真实评估数据。');
  console.log('※ 本章讨论一致性评估的方法与局限，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, loadDoc, sections, tables, stats, proseMatrices, kappaTable, audit };
