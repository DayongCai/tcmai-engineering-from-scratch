#!/usr/bin/env node
/**
 * 医古文 · 第 2 章 汉字与词汇
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/02-hanzi-cihui/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。四类用字关系那张表、通假三门槛、校勘四法的可靠性次序，
 * 全部当场从正文读出；次序不是抄来的，是按正文句子里出现的先后排出来的。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '2';
const SLUG = '02-hanzi-cihui';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/02-hanzi-cihui';

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(md) {
  const out = [{ title: '(前言)', text: [] }];
  for (const line of String(md).split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) out.push({ title: m[1], text: [] });
    else out[out.length - 1].text.push(line);
  }
  return out.map((s) => ({ title: s.title, text: s.text.join('\n') }));
}

function block(md, kw) {
  const lines = String(md).split(/\r?\n/);
  const start = lines.findIndex((l) => /^#{2,4}\s/.test(l) && l.includes(kw));
  if (start < 0) throw new Error('正文缺小节: ' + kw);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{2,4}\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

function numbered(text) {
  return String(text).split(/\r?\n/)
    .map((l) => /^\s*\d+\.\s+(.+)$/.exec(l))
    .filter(Boolean)
    .map((m) => m[1].trim());
}

function chapterTitle(md) {
  const m = /^#\s+(.+)$/m.exec(String(md));
  if (!m) throw new Error('正文缺 H1 章题');
  return m[1].trim();
}

function cardFields(md) {
  const m = /```[\s\S]*?```/.exec(String(md));
  if (!m) throw new Error('正文缺记录卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

/** 小节里的第一张表（去表头分隔行） */
function tables(text) {
  const groups = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) {
      if (!cur) { cur = []; groups.push(cur); }
      cur.push(line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    } else cur = null;
  }
  return groups.map((g) => g.filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')));
}

/** 四类用字关系：关系 / 性质 / 有无意义关联 / 证明要求 */
function relationRows(md) {
  const t = tables(block(md, '四类关系'))[0];
  if (!t) throw new Error('四类关系小节里没有表');
  return t.slice(1).map((r) => ({ name: r[0], nature: r[1], linked: r[2], proof: r[3] }));
}

/** 通假三门槛：正文写在一句话里，以顿号分隔 */
function proofGates(md) {
  const line = block(md, '四类关系').split(/\r?\n/).find((l) => l.includes('本字可考'));
  if (!line) throw new Error('正文缺通假三门槛');
  const m = /本字可考、声音可通、文义可安/.exec(line);
  if (!m) throw new Error('三门槛表述变了');
  return m[0].split('、');
}

/** 校勘四法按正文自述的可靠性排序（对校最实 … 理校最险） */
function collationOrder(md) {
  const text = block(md, '校勘四法');
  const line = text.split(/\r?\n/).find((l) => l.includes('最实'));
  if (!line) throw new Error('正文缺校勘四法的可靠性排序');
  const names = ['对校', '本校', '他校', '理校'];
  const got = names.filter((n) => line.includes(n));
  if (got.length !== 4) throw new Error('四法不全: ' + got.join('/'));
  return got.sort((a, b) => line.indexOf(a) - line.indexOf(b));
}

function main() {
  const md = readDoc();
  const rows = relationRows(md);
  const gates = proofGates(md);
  const order = collationOrder(md);
  const fields = cardFields(md);
  const items = numbered(block(md, '考核项'));

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`四类用字关系（${rows.length} 类，表由正文读出）：`);
  for (const r of rows) console.log(`  ${r.name}：${r.nature}；证明看「${r.proof}」`);
  console.log('');
  console.log(`通假三门槛：${gates.join(' / ')}（缺一不可）`);
  console.log(`校勘四法可靠性（按正文叙述先后）：${order.join(' > ')}`);
  console.log(`  最险的是${order[order.length - 1]}：它只依赖读者的判断。`);
  console.log('');
  console.log('辨字记录字段：');
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`考核项 ${items.length} 条。评分只看能不能回查：报不出篇名、韵部或版本的，作未辨处理。`);

  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  console.log('');
  console.log(`对照：通假「${byName['通假'] ? byName['通假'].linked : '—'}」；古今字「${byName['古今字'] ? byName['古今字'].linked : '—'}」。`);
  console.log('※ 以上结构与次序全部由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  tables, relationRows, proofGates, collationOrder,
};
