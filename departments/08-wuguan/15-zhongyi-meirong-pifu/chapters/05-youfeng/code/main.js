#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 5 章 油风：先确认毛囊还在，再谈补肝肾
 * 正文: chapters/05-youfeng/docs/zh.md
 * 做法: 从正文解析三证表、望诊四看与五种会伪装成斑秃的病，现算后打印。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '油风：先确认毛囊还在，再谈补肝肾';

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
  const lookSec = find('望诊');
  const looks = lookSec ? leads(lookSec.body) : [];
  const fakeSec = find('伪装');
  const fakes = fakeSec ? leads(fakeSec.body) : [];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    rows,
    looks,
    fakes,
    // 判据：先确认毛囊还在，再谈补肝肾
    gate: text.includes('毛囊口存在') && text.includes('无瘢痕'),
    // 判据：瘢痕性脱发毛囊已毁，任何生发治疗都无效
    scar: text.includes('毛囊已毁'),
    follicle: count(text, '毛囊'),
    avoid: count(text, '瘢痕')
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 5 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`证型表 ${a.rows.length} 行：${a.rows.join('、')}`);
  console.log(`望诊四看：${a.looks.join('、')}`);
  console.log(`会伪装成斑秃的病 ${a.fakes.length} 个：${a.fakes.join('、')}`);
  console.log(`毛囊口存在、无瘢痕的前置判断：${a.gate ? '成立' : '不成立'}`);
  console.log('');
  console.log(`关键词频次：毛囊 ${a.follicle} · 瘢痕 ${a.avoid}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，脱发病因鉴别须专科检查。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, analyze };
