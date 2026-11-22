#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 7 章：八个病证按窗口分三档，不按病重分
 * 正文: chapters/07-e117/docs/zh.md
 * 做法: 从正文解析窗口表，按窗口文字分档；再取单侧原则与外伤三行。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '急不是病重，是窗口短：八个病证，三种钟';

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

/** 窗口 → 档：分钟 / 天 / 周月 */
function bucketOf(window) {
  if (/秒|分钟/.test(window)) return '分钟档';
  if (/天/.test(window)) return '天档';
  return '周月档';
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const wt = tables(text).find((t) => t[0][0] === '病证');
  const rows = wt ? wt.slice(1).map((r) => ({ name: r[0], window: r[1], first: r[2] })) : [];
  const groups = { '分钟档': [], '天档': [], '周月档': [] };
  for (const r of rows) groups[bucketOf(r.window)].push(r.name);
  const sideSec = secs.find((s) => s.title.includes('单侧')) || { body: '' };
  const sideRules = sideSec.body.split('\n').filter((l) => /^- /.test(l.trim())).map((l) => l.replace(/^-\s*/, '').trim());
  const traumaSec = secs.find((s) => s.title.includes('外伤')) || { body: '' };
  const trauma = [...traumaSec.body.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]).filter((b) => /在前|在次|在第三/.test(b));
  return { title: TITLE, sections: secs.map((s) => s.title), rows, groups, sideRules, trauma };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 7 章 ${a.title}`);
  console.log('');
  console.log(`病证 ${a.rows.length} 个，按窗口分三档：`);
  for (const k of Object.keys(a.groups)) console.log(`  ${k}（${a.groups[k].length}）：${a.groups[k].join('、')}`);
  console.log('');
  console.log(`单侧原则 ${a.sideRules.length} 条：`);
  for (const r of a.sideRules) console.log(`  · ${r.replace(/\*\*/g, '').slice(0, 26)}…`);
  console.log('');
  console.log(`外伤排序 ${a.trauma.length} 行：${a.trauma.join(' → ')}`);
  console.log('');
  console.log('※ 以上由本章正文现算；分档是教学用的排序，不是临床时限标准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, bucketOf, analyze };
