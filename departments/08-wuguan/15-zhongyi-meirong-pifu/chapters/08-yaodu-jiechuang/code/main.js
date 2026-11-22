#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 8 章 药毒与疥疮：这两件事的第一步处置，都不是开方
 * 正文: chapters/08-yaodu-jiechuang/docs/zh.md
 * 做法: 从正文解析药毒四证、重症四信号、疥疮三物证与处置三头，核对「先减法」，现算后打印。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '药毒与疥疮：这两件事的第一步处置，都不是开方';

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
  const sevSec = find('重症药毒');
  const signals = sevSec ? leads(sevSec.body).slice(0, 4) : [];
  const evSec = find('三个物证');
  const evidence = evSec ? leads(evSec.body) : [];
  const actSec = find('疥疮的处置');
  const actions = actSec ? leads(actSec.body) : [];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    rows,
    signals,
    evidence,
    actions,
    // 判据：两病的第一步都是减法——先停药、先杀虫消毒
    stopFirst: text.includes('先停药，再辨证'),
    killFirst: text.includes('先杀虫消毒，再谈内外'),
    stop: count(text, '停药'),
    disinfect: count(text, '消毒'),
    temp: count(text, '50℃')
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 8 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`药毒证型表 ${a.rows.length} 行：${a.rows.join('、')}`);
  console.log(`重症四信号：${a.signals.join('、')}`);
  console.log(`疥疮三物证：${a.evidence.join('、')}`);
  console.log(`处置三头：${a.actions.join('、')}`);
  console.log(`先减法：停药 ${a.stopFirst ? '成立' : '不成立'} · 杀虫消毒 ${a.killFirst ? '成立' : '不成立'}`);
  console.log('');
  console.log(`关键词频次：停药 ${a.stop} · 消毒 ${a.disinfect} · 50℃ ${a.temp}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，浓度与疗程以说明书与执业规范为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, analyze };
