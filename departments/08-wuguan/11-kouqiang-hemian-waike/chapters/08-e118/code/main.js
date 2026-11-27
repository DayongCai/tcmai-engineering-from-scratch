#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 8 章：术后先看三条通道，再看肿胀曲线
 * 正文: chapters/08-e118/docs/zh.md
 * 做法: 从正文解析三条通道、肿胀曲线的观察项、进食分级与「三复」表。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '术后调护的第一顺位不是「补」，是三条通道';

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
  const channelSec = secs.find((s) => s.title.includes('三条通道')) || { body: '' };
  const channels = [...channelSec.body.matchAll(/^\*\*(气道|引流|进食)。\*\*/gm)].map((m) => m[1]);
  const curveT = tables(text).find((t) => t[0][0] === '观察项');
  const curve = curveT ? curveT.slice(1).map((r) => r[0]) : [];
  const eatT = tables(text).find((t) => t[0][0] === '情形');
  const eat = eatT ? eatT.slice(1).map((r) => r[0]) : [];
  const recT = tables(text).find((t) => t[0][0] === '复');
  const recur = recT ? recT.slice(1).map((r) => r[0]) : [];
  const backSec = secs.find((s) => s.title.includes('防复')) || { body: '' };
  const backs = [...backSec.body.matchAll(/^\d\. (.+?)[；。]$/gm)].map((m) => m[1]);
  return { title: TITLE, sections: secs.map((s) => s.title), channels, curve, eat, recur, backs };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 8 章 ${a.title}`);
  console.log('');
  console.log(`三条通道（以小时计）：${a.channels.join(' → ')}`);
  console.log(`肿胀曲线观察 ${a.curve.length} 项：${a.curve.join('、')}`);
  console.log(`进食分级 ${a.eat.length} 档：${a.eat.join(' / ')}`);
  console.log(`瘥后防复 ${a.recur.length} 类：${a.recur.join('、')}`);
  console.log('');
  console.log('返院指征：');
  for (const b of a.backs) console.log(`  · ${b.replace(/\*\*/g, '')}`);
  console.log('');
  console.log('※ 以上由本章正文现算；不给克数、热量、训练参数与换药技术。');
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
