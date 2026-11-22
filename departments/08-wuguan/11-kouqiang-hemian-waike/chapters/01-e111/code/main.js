#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 1 章：边界由五件事与三问共同决定
 * 正文: chapters/01-e111/docs/zh.md
 * 做法: 从正文里解析能力包的表、三问的条目与关键词频次，现算后打印。
 * 依赖: 仅 Node.js 标准库。数字不手打，正文改版后重跑即可复现。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '一个科的边界不在器官上，在「谁能承担后果」上';

function docText() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 二级标题切段 */
function sections(text) {
  const marks = [...text.matchAll(/^## (.+)$/gm)];
  return marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { title: m[1].trim(), body: text.slice(start, end) };
  });
}

/** 取所有 Markdown 表格，返回每张表的行（已去掉分隔行与表头） */
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

/** 形如 1. **……** 的编号条目 */
function numberedStems(text) {
  return [...text.matchAll(/^\s*(\d)\.\s+\*\*(.+?)\*\*/gm)].map((m) => ({ n: Number(m[1]), stem: m[2] }));
}

function count(text, term) {
  return text.split(term).length - 1;
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const caps = tables(text).find((t) => t[0] && t[0][0] === '要素');
  const items = caps ? caps.slice(1).map((r) => r[0]) : [];
  const askSec = secs.find((s) => s.title.includes('可执行的判断'));
  const asks = askSec ? numberedStems(askSec.body) : [];
  const hanzi = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return {
    title: TITLE,
    sections: secs.map((s) => s.title),
    items,
    asks,
    hanzi,
    airway: count(text, '气道'),
    referral: count(text, '转诊'),
    pathology: count(text, '病理')
  };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 1 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节。`);
  console.log('');
  console.log(`能力包（表中 ${a.items.length} 项）：${a.items.join('、')}`);
  console.log(`三问（按序）：`);
  for (const q of a.asks) console.log(`  ${q.n}. ${q.stem}`);
  console.log('');
  console.log(`关键词频次：气道 ${a.airway} · 病理 ${a.pathology} · 转诊 ${a.referral}`);
  console.log('');
  console.log('※ 以上数字由本章正文现算；不构成医学意见，边界以所在机构制度为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, numberedStems, count, analyze };
