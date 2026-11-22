#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 2 章 湿疮：辨证辨得再准，剂型用错也白搭
 * 正文: chapters/02-shichuang/docs/zh.md
 * 做法: 从正文解析证型表与剂型阶梯，核对「渗出→湿敷、干厚→软膏」的配对，现算后打印。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '湿疮：辨证辨得再准，剂型用错也白搭';

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
  return out.filter((t) => t.length > 0);
}

function leads(body) {
  return [...body.matchAll(/^\*\*([^*]+)\*\*/gm)]
    .map((m) => m[1].replace(/^其[一二三四五六七八九][，、]\s*/, '').replace(/[。：:]\s*$/, '').trim())
    .filter(Boolean);
}

function count(text, term) {
  return text.split(term).length - 1;
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const find = (kw) => secs.find((s) => s.title.includes(kw));
  const table = tables(text).find((t) => t[0] && t[0][0] === '证');
  const rows = table ? table.slice(1).map((r) => r[0]) : [];
  const stepSec = find('剂型阶梯');
  const ladder = stepSec ? leads(stepSec.body) : [];
  const stepBody = stepSec ? stepSec.body : '';
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    rows,
    ladder,
    // 判据：渗液的用湿敷，干厚的用软膏，方向不能互换
    wetRule: /湿敷/.test(stepBody.split('第一级')[1] || '') && stepBody.includes('前提是**皮损是湿的**'),
    dryRule: stepBody.includes('前提是**皮损是干的、厚的**'),
    ooze: count(text, '渗液'),
    hormone: count(text, '激素'),
    lichen: count(text, '苔藓样变')
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 2 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`证型表 ${a.rows.length} 行：${a.rows.join('、')}`);
  console.log(`剂型阶梯 ${a.ladder.length} 级：${a.ladder.join(' → ')}`);
  console.log(`配对：渗液→湿敷 ${a.wetRule ? '成立' : '不成立'} · 干厚→软膏 ${a.dryRule ? '成立' : '不成立'}`);
  console.log('');
  console.log(`关键词频次：渗液 ${a.ooze} · 苔藓样变 ${a.lichen} · 激素 ${a.hormone}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，具体剂型与浓度以执业判断与机构规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, analyze };
