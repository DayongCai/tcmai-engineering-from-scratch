#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 3 章：把「火毒」拆成入口、界面与宿主
 * 正文: chapters/03-e113/docs/zh.md
 * 做法: 从正文解析病名三层的命名、四个可观察的征、宿主核对表与三步判断。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '火毒是结论，不是原因';

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

function bolds(text) {
  return [...text.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1].trim());
}

function entriesOf(body) {
  const out = [];
  const m1 = body.match(/第一位入口是\*{0,2}([^*，。]+)\*{0,2}/);
  const m2 = body.match(/第二位入口是\*{0,2}([^*，。]+)\*{0,2}/);
  if (m1) out.push(m1[1]);
  if (m2) out.push(m2[1]);
  for (const m of body.matchAll(/\*\*(创口|血行)\*\*是第[三四]位/g)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const naming = secs.find((s) => s.title.startsWith('一、')) || { body: '' };
  const layers = bolds(naming.body).filter((b) => /^(病位深浅|形态|病性)$/.test(b));
  const signsSec = secs.find((s) => s.title.includes('可观察')) || { body: '' };
  const signs = bolds(signsSec.body).filter((b) => /^(肿|痛|热|功能障碍)$/.test(b));
  const hostT = tables(text).find((t) => t[0][0] === '宿主因素');
  const hosts = hostT ? hostT.slice(1).map((r) => r[0]) : [];
  const steps = [...text.matchAll(/第[一二三]步，\*\*(.+?)\*\*/g)].map((m) => m[1]);
  const entries = entriesOf(secs.find((s) => s.title.includes('两个入口')).body);
  return {
    title: TITLE,
    sections: secs.map((s) => s.title),
    layers,
    signs,
    hosts,
    steps,
    entries
  };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 3 章 ${a.title}`);
  console.log('');
  console.log(`病名叠三层：${a.layers.join(' / ')}`);
  console.log(`入口 ${a.entries.length} 条：${a.entries.join('；')}`);
  console.log('');
  console.log(`四个可观察的征（按可靠性）：${a.signs.join(' → ')}`);
  console.log(`宿主核对 ${a.hosts.length} 行：${a.hosts.join('、')}`);
  console.log('');
  console.log(`处置三步：${a.steps.join(' → ')}`);
  console.log('');
  console.log('※ 以上由本章正文现算；不给药物、剂量与时机阈值，临床处置以现行规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, bolds, analyze };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
