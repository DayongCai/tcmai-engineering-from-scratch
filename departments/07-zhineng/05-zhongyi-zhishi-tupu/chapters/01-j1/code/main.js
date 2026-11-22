#!/usr/bin/env node
/**
 * 中医知识图谱 · 第 1 章 三元组答得出「谁和谁有关」，答不出「先学谁」
 * 课程: departments/07-zhineng/05-zhongyi-zhishi-tupu/chapters/01-j1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从本章正文现算：五级编码表逐行读出，叶数由「章节叶 + 病证叶」相加核对，
 * 树边数按 n−1 推出，单元归并率由 18,065 个教材单元与叶数相除得到。
 * 手打的数字会在正文改稿后静默过期，这里一个都不写。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '三元组答得出「谁和谁有关」，答不出「先学谁」';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

/** 把 Markdown 表格解析成 {header, rows}，依赖分隔行 |---| 判定表头。 */
function parseTables(md) {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (i + 1 >= lines.length || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(splitRow(lines[j])); j += 1; }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

/** 取单元格里的第一个数，去掉千分位逗号。 */
function num(s) {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const tables = parseTables(body);

  // 五级编码表：L0 须 / L1 根 / L2 干 / L3 枝 / L4 叶，最后一行是概念丛
  const lvTable = tables.find((t) => t.header.join('').includes('层级'));
  if (!lvTable) throw new Error('正文里没有五级编码表');
  const levels = lvTable.rows.map((r) => ({
    level: r[0],
    name: r[1],
    count: num(r[2]),
    note: r[3] || '',
  }));

  const leafRow = levels.find((x) => x.level === 'L4');
  const clusterRow = levels.find((x) => x.level === '—' || x.level === '-');
  const lCount = levels.filter((x) => /^L\d$/.test(x.level)).length;

  // 叶数核对：表格给的 2,592 应当等于「章节叶 + 病证叶」
  const parts = leafRow.note.match(/(\d[\d,]*)\s*\+\s*\D*?(\d[\d,]*)/);
  const chapterLeaves = parts ? num(parts[1]) : null;
  const dsuLeaves = parts ? num(parts[2]) : null;
  const leafSum = chapterLeaves + dsuLeaves;

  // 树边：n 个节点只要 n−1 条边就能连通无环
  const treeEdges = leafRow.count - 1;

  // 单元层规模与归并率
  const unitHit = body.match(/教材单元层现有\s*([\d,]+)\s*个单元/);
  const units = unitHit ? num(unitHit[1]) : null;
  const mergeRatio = units ? 1 - leafRow.count / units : null;

  // 两层的性质对照表（层次 / 关系）
  const twoTable = tables.find((t) => t.header[1] === '层次（树）');
  const twoRows = twoTable ? twoTable.rows.length : 0;

  // 概念丛的准入门槛
  const clusterGate = /被三个以上院系引用/.test(body);

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    levels,
    lCount,
    leafCount: leafRow.count,
    chapterLeaves,
    dsuLeaves,
    leafSum,
    treeEdges,
    units,
    mergeRatio,
    twoRows,
    cluster: clusterRow ? clusterRow.count : null,
    clusterGate,
  };
}

function main() {
  const a = analyze(read());
  const pct = (x) => (x == null ? '—' : (x * 100).toFixed(1) + '%');

  console.log(`中医知识图谱 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${a.hanzi} 汉字 · 编码层 ${a.lCount} 级 · 概念丛 ${a.cluster} 个`);
  console.log('');
  console.log('五级编码（逐行读出）：');
  for (const l of a.levels) {
    console.log(`  ${String(l.level).padEnd(2)} ${l.name.padEnd(12, '　')} ${String(l.count).padStart(6)}`);
  }
  console.log('');
  console.log(`叶数核对：章节叶 ${a.chapterLeaves} + 病证叶 ${a.dsuLeaves} = ${a.leafSum}，表内 ${a.leafCount}`);
  console.log(`树边最少需要 n−1 = ${a.treeEdges} 条（任意两节点路径唯一的前提）`);
  console.log(`单元归并率：${a.units} 个教材单元 → ${a.leafCount} 片叶，归并 ${pct(a.mergeRatio)}`);
  console.log(`两层性质对照表 ${a.twoRows} 行；概念丛门槛（三个以上院系）：${a.clusterGate ? '正文已写明' : '未出现'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为知识表示讨论，不构成诊断或辨证依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, num };
