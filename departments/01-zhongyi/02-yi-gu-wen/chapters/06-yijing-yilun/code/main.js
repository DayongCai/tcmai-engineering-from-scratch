#!/usr/bin/env node
/**
 * 医古文 · 第 6 章 医经医论文选
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/06-yijing-yilun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。四段骨架、引用四件事、记录六栏、三种失效，全部当场从正文读出；
 * 骨架是按正文「第一段立现状」这类句子数出来的，不是按常识填的。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '6';
const SLUG = '06-yijing-yilun';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/06-yijing-yilun';

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
  if (!m) throw new Error('正文缺医论读记代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 说理文四段：第一段立现状 … 第四段给对策 */
function fourParts(md) {
  return [...block(md, '说理文的骨架').matchAll(/第([一二三四])段(\S{2,3})(?=。|，)/g)]
    .map((m) => ({ n: m[1], act: m[2] }));
}

/** 引用要交代的四件事：其一，**出处到篇**。 */
function quoteFour(md) {
  return [...block(md, '引用一个动作').matchAll(/其[一二三四]，\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
}

function main() {
  const md = readDoc();
  const parts = fourParts(md);
  const quotes = quoteFour(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`说理文骨架 ${parts.length} 段：${parts.map((p) => `第${p.n}段${p.act}`).join(' → ')}`);
  console.log('  读一段医论，先找这四段；找不出哪一段，哪一段往往就是作者没说清的地方。');
  console.log('');
  console.log(`引用要交代的 ${quotes.length} 件事：${quotes.join(' / ')}`);
  console.log('  缺任何一件，引用就退化成摘句；摘句不是错，错在用摘句代替论证。');
  console.log('');
  console.log(`医论读记 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：③④栏是否指出注家与出处，⑥栏是否写出边界。`);
  console.log('※ 段数与件数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, fourParts, quoteFour,
};
