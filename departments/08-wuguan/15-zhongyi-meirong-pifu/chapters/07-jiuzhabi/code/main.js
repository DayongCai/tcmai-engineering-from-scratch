#!/usr/bin/env node
/**
 * 中医美容皮肤 · 第 7 章 酒齄鼻：一张遇热就红的脸，先改环境，再改方子
 * 正文: chapters/07-jiuzhabi/docs/zh.md
 * 做法: 从正文解析三证表、五条诱因与四种需要鉴别的病，核对「可逆性刻度」，现算后打印。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '酒齄鼻：一张遇热就红的脸，先改环境，再改方子';

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
  const trigSec = find('诱因');
  const triggers = trigSec ? leads(trigSec.body) : [];
  const diffSec = find('伪装');
  const diffs = diffSec ? leads(diffSec.body) : [];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    rows,
    triggers,
    diffs,
    // 判据：红丝是不可逆的标志，能靠药改变的部分越往后越少
    irreversible: text.includes('红丝是不可逆的标志'),
    // 判据：面中部不明原因的红，不要先上激素
    noSteroid: text.includes('不要先上激素'),
    alcohol: count(text, '酒'),
    telangiectasia: count(text, '红丝')
  };
}

function report(a) {
  console.log(`中医美容皮肤 · 第 7 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`证型表 ${a.rows.length} 行：${a.rows.join('、')}`);
  console.log(`诱因 ${a.triggers.length} 条：${a.triggers.join('、')}`);
  console.log(`需要鉴别的病 ${a.diffs.length} 个：${a.diffs.join('、')}`);
  console.log(`红丝不可逆：${a.irreversible ? '写明' : '未写明'} · 病因未明先不上激素：${a.noSteroid ? '写明' : '未写明'}`);
  console.log('');
  console.log(`关键词频次：酒 ${a.alcohol} · 红丝 ${a.telangiectasia}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，物理手段与外科处置由专科判断。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, analyze };
