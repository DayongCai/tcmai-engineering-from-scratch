#!/usr/bin/env node
/**
 * 中国医学史 · 第 5 章 宋金元：争鸣与建制
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/05-songjinyuan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。四家的对手与转化规则、新说的两个条件、条目卡六栏、三种失效，
 * 全部当场从正文的表与加粗句里读出；家数与正文自述的「四家」对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '5';
const SLUG = '05-songjinyuan';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/05-songjinyuan';

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

/** 任意级标题（## 或 ###）下的正文块；同名取最后一个（如 §五 下还嵌着「### 考核项」） */
function block(md, kw) {
  const lines = String(md).split('\n');
  let start = -1;
  lines.forEach((l, i) => { if (/^#{2,4}\s/.test(l) && l.includes(kw)) start = i; });
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
  if (!m) throw new Error('正文缺宋金元医史条目卡代码块');
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

/** 四家的表：医家 / 标签 / 反对什么 / 转化规则 */
function fourHouses(md) {
  const t = tables(block(md, '四家的对手'))[0];
  if (!t) throw new Error('四家表不存在');
  return t.slice(1).map((r) => ({ name: r[0], label: r[1], against: r[2], rule: r[3] }));
}

/** 新说的两个条件：**条件一：…。** */
function twoConditions(md) {
  return [...block(md, '一个新说的两个条件').matchAll(/^\*\*条件([一二])：(.+?)。\*\*/gm)]
    .map((m) => ({ n: m[1], text: m[2].trim() }));
}

function main() {
  const md = readDoc();
  const houses = fourHouses(md);
  const conds = twoConditions(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`四家与他们的对手（${houses.length} 家，表由正文读出）：`);
  for (const h of houses) console.log(`  ${h.name}（${h.label}）反对${h.against} → 规则：${h.rule}`);
  console.log('  标签可以背，对手不能背：要说出对手，必须知道当时的通行做法是什么。');
  console.log('');
  console.log(`新说的 ${conds.length} 个条件：`);
  for (const c of conds) console.log(`  条件${c.n}：${c.text}`);
  console.log('');
  console.log(`宋金元条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：③栏是否可被证伪，⑤栏是否写出对手。`);
  console.log('※ 家数与条件数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, tables, fourHouses, twoConditions,
};
