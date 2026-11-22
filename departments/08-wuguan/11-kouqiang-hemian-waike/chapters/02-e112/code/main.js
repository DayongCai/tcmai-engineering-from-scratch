#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 2 章：层次与间隙，读的是阻力与交通
 * 正文: chapters/02-e112/docs/zh.md
 * 做法: 从正文解析层次表、间隙表与神经分支，现算后打印；不写死数字。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '层次是防线，间隙是走廊';

function docText() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  const marks = [...text.matchAll(/^## (.+)$/gm)];
  return marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { title: m[1].trim(), body: text.slice(start, end) };
  });
}

function tables(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) { cur = null; continue; }
    if (!cur) { cur = []; out.push(cur); }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    cur.push(cells);
  }
  return out.filter((t) => t.length > 1);
}

function findTable(list, head) {
  return list.find((t) => t[0][0] === head) || null;
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const all = tables(text);
  const layerT = findTable(all, '层次');
  const gapT = findTable(all, '间隙');
  const layers = layerT ? layerT.slice(1).map((r) => r[0]) : [];
  const gaps = gapT ? gapT.slice(1).map((r) => ({ name: r[0], to: r[2], note: r[3] })) : [];
  const branchLine = (text.match(/颞支、颧支、颊支、下颌缘支、颈支/) || [''])[0];
  const branches = branchLine ? branchLine.split('、') : [];
  const exits = ['眶上裂', '圆孔', '卵圆孔'].filter((x) => text.includes(x));
  return {
    title: TITLE,
    sections: secs.map((s) => s.title),
    layers,
    gaps,
    branches,
    exits,
    deepRisk: gaps.filter((g) => /气道/.test(g.note)).map((g) => g.name)
  };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 2 章 ${a.title}`);
  console.log('');
  console.log(`层次 ${a.layers.length} 层：${a.layers.join(' → ')}`);
  console.log('');
  console.log(`间隙 ${a.gaps.length} 个，按「相通去向」看：`);
  for (const g of a.gaps) console.log(`  ${g.name.padEnd(6, '　')} → ${g.to}`);
  console.log('');
  console.log(`面神经终末支 ${a.branches.length} 组：${a.branches.join('、')}`);
  console.log(`三叉神经三个出口：${a.exits.join('、')}`);
  console.log(`通到哪里就危及气道：${a.deepRisk.join('、')}`);
  console.log('');
  console.log('※ 以上由本章正文现算；层次与间隙名称以所在机构采用的教材与规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, findTable, analyze };
