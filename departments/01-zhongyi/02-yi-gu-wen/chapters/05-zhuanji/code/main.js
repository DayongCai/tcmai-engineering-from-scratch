#!/usr/bin/env node
/**
 * 医古文 · 第 5 章 医家传记文选
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/05-zhuanji/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。六个字段、卡上八栏、三种失效、传说层的降级判据，
 * 全部当场从正文的表、代码块与句子里读出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '5';
const SLUG = '05-zhuanji';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/05-zhuanji';

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
  if (!m) throw new Error('正文缺传记字段卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

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

/** 六个字段：字段 / 传中位置 / 可核对象 / 常见缺损 */
function bioFields(md) {
  const t = tables(block(md, '传记要读的六个字段'))[0];
  if (!t) throw new Error('六字段小节里没有表');
  return t.slice(1).map((r) => ({ field: r[0], where: r[1], checkable: r[2], gap: r[3] }));
}

/** 传说层的降级判据：只能用来解释什么、不能用来证明什么 */
function narrativeRule(md) {
  const m = /只能用来解释「([^」]+)」，不能用来证明「([^」]+)」/.exec(block(md, '把神异情节降一级'));
  if (!m) throw new Error('正文缺传说层判据');
  return { canExplain: m[1], cannotProve: m[2] };
}

function main() {
  const md = readDoc();
  const fields = bioFields(md);
  const card = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const rule = narrativeRule(md);
  const items = numbered(block(md, '考核项'));

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`传记要读的 ${fields.length} 个字段（表由正文读出）：`);
  for (const f of fields) console.log(`  ${f.field} —— 可核对象：${f.checkable}；常见缺损：${f.gap}`);
  console.log('');
  console.log(`字段卡 ${card.length} 栏：`);
  for (const c of card) console.log(`  ${c.no} ${c.name}`);
  console.log('');
  console.log(`传说层判据：只能用来解释「${rule.canExplain}」，不能用来证明「${rule.cannotProve}」。`);
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：②栏是否敢写「传不载」，⑦栏是否把传说降级。`);
  console.log('※ 字段数与栏数均从正文的表格与代码块现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, tables, bioFields, narrativeRule,
};
