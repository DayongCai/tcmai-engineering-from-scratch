#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 9 章：并发症按「信号—窗口—决定人」三格填
 * 正文: chapters/09-e119/docs/zh.md
 * 做法: 从正文解析时段表、并发症表、记录四要素与沟通的四段、三不许。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '识别并发症靠的不是经验，是术前就写好的那张「如果」清单';

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
  const timeT = tables(text).find((t) => t[0][0] === '时段');
  const compT = tables(text).find((t) => t[0][0] === '并发症');
  const recT = tables(text).find((t) => t[0][0] === '要素');
  const periods = timeT ? timeT.slice(1).map((r) => r[0]) : [];
  const comps = compT ? compT.slice(1).map((r) => ({ name: r[0], signal: r[1] })) : [];
  const record = recT ? recT.slice(1).map((r) => r[0]) : [];
  const saySec = secs.find((s) => s.title.includes('坏消息')) || { body: '' };
  const stages = [...saySec.body.matchAll(/\*\*第[一二三四]段，(.+?)。\*\*/g)].map((m) => m[1]);
  const forbids = [...saySec.body.matchAll(/\*\*不许(.+?)。\*\*/g)].map((m) => m[1]);
  return {
    title: TITLE,
    sections: secs.map((s) => s.title),
    periods,
    comps,
    record,
    stages,
    forbids,
    fastest: periods.filter((p) => /小时/.test(p))
  };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 9 章 ${a.title}`);
  console.log('');
  console.log(`按时段排队 ${a.periods.length} 段：${a.periods.join(' / ')}`);
  console.log(`其中以小时计的一行：${a.fastest.join('、')}`);
  console.log('');
  console.log(`并发症 ${a.comps.length} 条，每条三格（信号／窗口／决定人）：`);
  for (const c of a.comps) console.log(`  ${c.name.padEnd(8, '　')} 信号：${c.signal}`);
  console.log('');
  console.log(`坏消息四段：${a.stages.join(' → ')}`);
  console.log(`三个不许：${a.forbids.join('；')}`);
  console.log(`记录四要素：${a.record.join('、')}`);
  console.log('');
  console.log('※ 以上由本章正文现算；不给发生率与处置阈值，判断以现场与规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, analyze };
