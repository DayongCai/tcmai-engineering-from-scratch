#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 6 章：十个病名是一条按「脓的出路」排的深度轴
 * 正文: chapters/06-e116/docs/zh.md
 * 做法: 从正文解析病名表与颌面落点表，按「化不化脓 / 走窜」把十个病名归位。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '十个病名是一条深度轴：从疖到走黄，差的是「脓有没有出路」';

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
  const dz = tables(text).find((t) => t[0][0] === '病名');
  const mapT = tables(text).find((t) => t[0][0] === '教材病名');
  const diseases = dz ? dz.slice(1).map((r) => ({ name: r[0], layer: r[1], pus: r[2], spread: r[3] })) : [];
  const mapping = mapT ? mapT.slice(1).map((r) => ({ src: r[0], face: r[1], value: r[2] })) : [];
  const deepSec = secs.find((s) => s.title.includes('深度')) || { body: '' };
  const readings = [...deepSec.body.matchAll(/\*\*第[一二三四]，(.+?)。\*\*/g)].map((m) => m[1]);
  return {
    title: TITLE,
    sections: secs.map((s) => s.title),
    diseases,
    mapping,
    readings,
    nonPus: diseases.filter((d) => /不化脓|不.*脓/.test(d.pus)).map((d) => d.name),
    spreads: diseases.filter((d) => /转移|多发|入血|全身|此愈彼起/.test(d.spread)).map((d) => d.name)
  };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 6 章 ${a.title}`);
  console.log('');
  console.log(`病名 ${a.diseases.length} 个，按层次排：`);
  for (const d of a.diseases) console.log(`  ${d.name.padEnd(6, '　')} ${d.layer}｜${d.pus}`);
  console.log('');
  console.log(`深度读数 ${a.readings.length} 项：${a.readings.join(' → ')}`);
  console.log(`不按化脓走的病名：${a.nonPus.join('、')}`);
  console.log(`会离开局部的病名：${a.spreads.join('、')}`);
  console.log(`颌面落点 ${a.mapping.length} 条，例：${a.mapping.slice(0, 3).map((m) => `${m.src}→${m.face}`).join('；')}`);
  console.log('');
  console.log('※ 以上由本章正文现算；病名类比不是诊断标准，也不替代病理与病原学。');
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
