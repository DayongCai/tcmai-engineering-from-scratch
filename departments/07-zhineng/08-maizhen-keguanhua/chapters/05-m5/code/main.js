#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 5 章 决策树：能背下来的规则，才是能进诊室的规则
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/05-m5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：三套脉名体系的脉数、树的叶子数上限（2^d）、
 * 一片叶子上「多数」的比例区间（标准误与 95% 半宽）、要素维度数与可读性档位。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '决策树：能背下来的规则，才是能进诊室的规则';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function tables(text) {
  const lines = String(text).split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^\s*\|/.test(lines[i])) { i += 1; continue; }
    const block = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { block.push(lines[i]); i += 1; }
    if (block.length < 3 || !/^\s*\|[\s:|-]+\|\s*$/.test(block[1])) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    out.push({ header: cells(block[0]), rows: block.slice(2).map(cells) });
  }
  return out;
}

const num = (s) => {
  const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/** 深度 d 的二叉树叶子数上限 */
const leafCap = (d) => 2 ** d;

/** 一片叶子上「多数」的比例及其 95% 区间（二项正态近似） */
function leafInterval(k, n) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n <= 0 || k < 0 || k > n) throw new Error('计数越界: ' + k + '/' + n);
  const p = k / n;
  const se = Math.sqrt((p * (1 - p)) / n);
  return { k, n, p, se, half: 1.96 * se };
}

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);

  const sysT = tbl.find((t) => t.header.includes('脉数'));
  const systems = sysT ? sysT.rows.map((r) => ({ name: r[0].replace(/《|》/g, ''), count: num(r[1]) })) : [];

  const depthT = tbl.find((t) => t.header.join('').includes('叶子数'));
  const depths = depthT ? depthT.rows.map((r) => ({ d: num(r[0]), cap: num(r[1]) })) : [];

  const elemT = tbl.find((t) => t.header.includes('要素'));
  const leafM = body.match(/(\d+)\s*例是 A、(\d+)\s*例是 B/);
  const nPerLeaf = body.match(/平均每片\s*(\d+)\s*例/);
  const k = leafM ? Number(leafM[1]) : NaN;
  const other = leafM ? Number(leafM[2]) : NaN;
  const n = nPerLeaf ? Number(nPerLeaf[1]) : k + other;

  return {
    hanzi: (body.match(HANZI) || []).length,
    tables: tbl.length,
    systems,
    depths,
    elements: elemT ? elemT.rows.length : 0,
    leaf: leafInterval(k, n),
    readLevels: depths.length,
  };
}

function main() {
  const text = read();
  const a = analyze(text);

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 表格 ${a.tables} 张 · 要素 ${a.elements} 维`);
  console.log('');
  console.log('三套体系的脉数（正文表格现读）：');
  for (const s of a.systems) console.log(`  ${s.name}：${s.count} 脉`);
  console.log('  → 名称在增，类别集合没有闭合；跨研究的混淆矩阵因此无法对齐。');
  console.log('');
  console.log('深度 → 叶子数上限（2^d）与可读性：');
  for (const row of a.depths) {
    const calc = leafCap(row.d);
    const flag = calc === row.cap ? '一致' : `表内 ${row.cap}`;
    console.log(`  深度 ${String(row.d).padStart(2)}  叶子 ≤ ${String(calc).padStart(3)}（${flag}）`);
  }
  console.log('');
  const L = a.leaf;
  console.log(`叶子上的「多数」：${L.k}/${L.n} → ${(L.p * 100).toFixed(0)}%`);
  console.log(`  标准误 ${L.se.toFixed(3)}，乘 1.96 得 ±${L.half.toFixed(2)}（即 ±${(L.half * 100).toFixed(0)} 个百分点）`);
  console.log('  → 一层叶子上的「多数」只撑得起「值得再看一次」，撑不起「这一条是规律」。');
  console.log('');
  console.log('※ 叶子区间是正文的演算设定（120 例、八片叶），不是任何真实研究的分布。');
  console.log('※ 本章的规则示例是结构示意，不含真实病例，不得作为诊断依据直接使用。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, tables, leafCap, leafInterval };
