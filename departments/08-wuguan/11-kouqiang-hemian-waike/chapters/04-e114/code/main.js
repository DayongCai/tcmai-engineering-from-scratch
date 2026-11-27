#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 4 章：把肿、痛、脓读成三条处置线
 * 正文: chapters/04-e114/docs/zh.md
 * 做法: 从正文解析阴阳对照表、辨肿五维、辨痛五问、辨脓五据与三条线。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '肿、痛、脓：三个词，九种组合，只有一种可以「等」';

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

function analyze() {
  const text = docText();
  const secs = sections(text);
  const yinT = tables(text).find((t) => t[0][0] === '项');
  const yinRows = yinT ? yinT.slice(1).map((r) => r[0]) : [];
  const pusT = tables(text).find((t) => t[0][0] === '依据');
  const pusRows = pusT ? pusT.slice(1).map((r) => r[0]) : [];
  const dims = [...text.matchAll(/\*\*第[一二三四五]，(.+?)。\*\*/g)].map((m) => m[1]);
  const asks = [...text.matchAll(/^\*\*问(.+?)\*\*/gm)].map((m) => m[1]);
  const lines = [...text.matchAll(/\*\*(第[一二三]条线[^*]+)\*\*/g)].map((m) => m[1]);
  return {
    title: TITLE,
    sections: secs.map((s) => s.title),
    yinRows,
    pusRows,
    dims,
    asks,
    lines
  };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 4 章 ${a.title}`);
  console.log('');
  console.log(`阴阳对照 ${a.yinRows.length} 项：${a.yinRows.join('、')}`);
  console.log(`辨肿 ${a.dims.length} 维：${a.dims.join(' → ')}`);
  console.log(`辨痛 ${a.asks.length} 问：问${a.asks.join('、问')}`);
  console.log(`辨脓 ${a.pusRows.length} 据：${a.pusRows.join('、')}`);
  console.log('');
  console.log('处置三条线：');
  for (const l of a.lines) console.log(`  ${l}`);
  console.log('');
  console.log('※ 以上由本章正文现算；不给引流时机、切口与用药，处置以现行规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
