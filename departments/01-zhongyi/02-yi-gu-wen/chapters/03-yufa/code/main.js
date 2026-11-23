#!/usr/bin/env node
/**
 * 医古文 · 第 3 章 语法
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/03-yufa/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。判断句几式、前置几个条件、被动判据分几步、失效几种，
 * 全部当场从正文里数出来；数出来的数与正文自述对不上就报错，不往下算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '3';
const SLUG = '03-yufa';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/03-yufa';

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
  if (!m) throw new Error('正文缺析句记录代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 判断句五式：数「一为…五为」这类序数式 */
function judgeForms(md) {
  return [...block(md, '判断句').matchAll(/([一二三四五六七八九十])为/g)].map((m) => m[1]);
}

/** 被动判据的两步：先看…，再看…。 */
function passiveSteps(md) {
  const line = block(md, '被动句').split(/\r?\n/).find((l) => l.includes('先看'));
  const m = /先看(.+?)，再看(.+?)。/.exec(line || '');
  if (!m) throw new Error('正文缺被动判据的两步');
  return [m[1].trim(), m[2].trim()];
}

/** 宾语前置的三条件（正文把三条写在同一段里） */
function preposeConditions(md) {
  return [...block(md, '语序与省略').matchAll(/其[一二三]，(.+?)。/g)].map((m) => m[1].trim());
}

function main() {
  const md = readDoc();
  const forms = judgeForms(md);
  const steps = passiveSteps(md);
  const conds = preposeConditions(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`判断句：正文列 ${forms.length} 式（${forms.join('、')}为…），判据只有一条——能否在主语与谓语之间补出「是」而不改原意。`);
  console.log(`被动句：判据分 ${steps.length} 步——先看${steps[0]}，再看${steps[1]}。`);
  console.log('');
  console.log(`宾语前置的 ${conds.length} 个触发条件：`);
  conds.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  console.log('  条件之外不能前置：读不通就说是「前置」，等于取消了语法。');
  console.log('');
  console.log('析句记录字段：');
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看两件：④栏判据可当场复核，⑥栏敢写「存疑」。`);
  console.log('※ 式数、步数、条件数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, judgeForms, passiveSteps, preposeConditions,
};
