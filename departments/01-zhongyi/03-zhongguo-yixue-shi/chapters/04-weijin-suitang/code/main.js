#!/usr/bin/env node
/**
 * 中国医学史 · 第 4 章 魏晋南北朝至隋唐五代：分科与集成
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/04-weijin-suitang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。四种集成方式、分科三条线（及第四条「按机构」）、条目卡六栏、三种失效，
 * 全部当场从正文读出；集成方式的数目还与正文自述的「四类就够」对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '4';
const SLUG = '04-weijin-suitang';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/04-weijin-suitang';

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
  if (!m) throw new Error('正文缺隋唐医史条目卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 四种集成方式：第一类是**按术集成**。 */
function integrationKinds(md) {
  return [...block(md, '四种「集成」的方式').matchAll(/第([一二三四])类是\*\*按(.+?)集成\*\*/g)]
    .map((m) => ({ n: m[1], kind: `按${m[2]}集成` }));
}

/** 分科三条线（段首加粗）：按病分／按人分／按术分 */
function divisionLines(md) {
  return [...block(md, '分科的三条线').matchAll(/^\*\*按(.+?)分。\*\*/gm)].map((m) => `按${m[1]}分`);
}

function main() {
  const md = readDoc();
  const kinds = integrationKinds(md);
  const lines = divisionLines(md);
  const hasAgency = /按机构分/.test(block(md, '分科的三条线'));
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`集成方式 ${kinds.length} 类：${kinds.map((k) => k.kind).join(' / ')}`);
  console.log('  看一部书按什么集成，就知道它打算解决谁的问题。');
  console.log('');
  console.log(`分科 ${lines.length} 条线：${lines.join(' / ')}${hasAgency ? '；第四条是按机构分' : ''}`);
  console.log('  前三条线的动力都可自发产生；真正需要国家介入的是按机构分，太医署属这一条。');
  console.log('');
  console.log(`隋唐条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：②③是否配套，⑤⑥是否只取一面。`);
  console.log('※ 类数与线数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, integrationKinds, divisionLines,
};
