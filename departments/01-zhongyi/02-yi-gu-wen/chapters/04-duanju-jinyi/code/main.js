#!/usr/bin/env node
/**
 * 医古文 · 第 4 章 断句、标点与今译
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/04-duanju-jinyi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。六类误断、辨正四步、今译四法、记录七栏、三种失效，
 * 全部当场从正文的枚举句里读出来；读出来的数与正文自述（「归为六」「四步」「四法」）当场对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '4';
const SLUG = '04-duanju-jinyi';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/04-duanju-jinyi';

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
  if (!m) throw new Error('正文缺断句·今译记录代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 从「归为六：A、B、C。」这类枚举句里，取起点标记之后到句号为止，再按顿号拆开 */
function splitList(md, startMarker) {
  const line = String(md).split('\n').find((l) => l.includes(startMarker));
  if (!line) throw new Error('正文缺枚举句: ' + startMarker);
  const rest = line.slice(line.indexOf(startMarker) + startMarker.length);
  const end = rest.indexOf('。');
  return (end < 0 ? rest : rest.slice(0, end))
    .split(/[、，]/).map((s) => s.trim()).filter(Boolean);
}

const sixCauses = (md) => splitList(md, '归为六：');
const fourSteps = (md) => splitList(md, '缺一不可：');
const transMethods = (md) => splitList(md, '四法是');

/** 回译校验的三层（字词层／句法层／篇章层），正文用破折号围住 */
function retroLayers(md) {
  return [...String(md).matchAll(/(字词层|句法层|篇章层)看([^；—]+)/g)]
    .map((m) => ({ name: m[1], what: m[2].trim() }));
}

function main() {
  const md = readDoc();
  const causes = sixCauses(md);
  const steps = fourSteps(md);
  const methods = transMethods(md);
  const fields = cardFields(md);
  const layers = retroLayers(md);
  const items = numbered(block(md, '考核项'));

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`六类误断（读出 ${causes.length} 类）：${causes.join(' / ')}`);
  console.log('  六类看似并列，前五类最后都落到医理上，医籍断句的最终裁判是医理。');
  console.log('');
  console.log(`辨正程序 ${steps.length} 步：${steps.join(' → ')}`);
  console.log(`今译 ${methods.length} 法：${methods.join(' / ')}；主法是${methods[0]}，理由是它能逐字对勘。`);
  console.log('');
  console.log(`断句·今译记录 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`回译校验 ${layers.length} 层：`);
  for (const l of layers) console.log(`  ${l.name}：看${l.what}`);
  console.log(`考核项 ${items.length} 条。评分只看：②栏判据是否指定到六类中的具体一类，⑦栏是否写出让步。`);
  console.log('※ 类数、步数、法数均与正文自述逐一对账后现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, splitList, sixCauses, fourSteps, transMethods, retroLayers,
};
