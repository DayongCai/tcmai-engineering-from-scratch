#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 10 章：把判断搬出脑袋——病历、同意、转诊
 * 正文: chapters/10-e1110/docs/zh.md
 * 做法: 从正文解析三个读者、六个必写项、同意的三件事与转诊包六件。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '病历、同意书、转诊单，写的是同一件事：把判断搬出脑袋';

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
  const readerSec = secs.find((s) => s.title.includes('三个读者')) || { body: '' };
  const readers = [...readerSec.body.matchAll(/\*\*第一个是(.+?)。\*\*|\*\*第二个是(.+?)。\*\*|\*\*第三个是(.+?)。\*\*/g)]
    .map((m) => m[1] || m[2] || m[3]);
  const mustT = tables(text).find((t) => t[0][0] === '必写项');
  const musts = mustT ? mustT.slice(1).map((r) => r[0]) : [];
  const packetT = tables(text).find((t) => t[0][0] === '件');
  const packet = packetT ? packetT.slice(1).map((r) => r[0]) : [];
  const consentSec = secs.find((s) => s.title.includes('知情同意')) || { body: '' };
  const consent = [...consentSec.body.matchAll(/\*\*第[一二三]件：(.+?)。\*\*/g)].map((m) => m[1]);
  return { title: TITLE, sections: secs.map((s) => s.title), readers, musts, packet, consent };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 10 章 ${a.title}`);
  console.log('');
  console.log(`病历的三个读者：${a.readers.join(' / ')}`);
  console.log(`必写 ${a.musts.length} 项：${a.musts.join('、')}`);
  console.log(`同意要说清 ${a.consent.length} 件事：${a.consent.join('；')}`);
  console.log(`转诊包 ${a.packet.length} 件：${a.packet.join('、')}`);
  console.log('');
  console.log('※ 以上由本章正文现算；文书条款、保存年限与签字权限依法规与机构制度。');
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
