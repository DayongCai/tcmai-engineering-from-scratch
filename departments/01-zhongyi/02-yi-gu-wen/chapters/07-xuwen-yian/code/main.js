#!/usr/bin/env node
/**
 * 医古文 · 第 7 章 方书本草序文与医话医案
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/07-xuwen-yian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。序文六个必答项、医案骨架几段、记录七栏、三种失效，
 * 全部当场从正文读出；医案段数还与正文自述的「五段」当场对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '7';
const SLUG = '07-xuwen-yian';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/07-xuwen-yian';

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
  if (!m) throw new Error('正文缺序跋·医案卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 序文六个必答项：其一，**作者是谁、凭什么作序**。 */
function prefaceItems(md) {
  return [...block(md, '序文：一部书的六个必答项').matchAll(/其[一二三四五六]，\*\*([^*]+)\*\*/g)]
    .map((m) => m[1].trim());
}

/** 医案骨架：先记…次述…再论…终定…；末段用「并」带出两层，故为五段 */
function caseSkeleton(md) {
  const text = block(md, '医案：从「议病式」');
  const m = /先记(.+?)，次述(.+?)，再论(.+?)，终定(.+?)。/.exec(text);
  if (!m) throw new Error('正文缺医案骨架句');
  const tail = m[4].split('并').map((s) => s.trim());
  return [m[1], m[2], m[3], ...tail].map((s) => s.trim());
}

/** 正文自述的段数（「这五段就是医案的骨架」） */
function declaredStages(md) {
  const m = /这(.)段就是医案的骨架/.exec(String(md));
  if (!m) throw new Error('正文缺医案段数自述');
  const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7 };
  return CN[m[1]];
}

/** 署款句：年号＋干支＋月日＋别号＋拜撰 */
function sealLine(md) {
  const line = String(md).split(/\r?\n/).find((l) => l.includes('拜撰'));
  if (!line) throw new Error('正文缺署款句');
  const m = /时(.+?拜撰)/.exec(line);
  return m ? m[1].trim() : line.trim();
}

function main() {
  const md = readDoc();
  const items6 = prefaceItems(md);
  const stages = caseSkeleton(md);
  const declared = declaredStages(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`序文必答项 ${items6.length} 项：`);
  items6.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log('');
  console.log(`医案骨架读出 ${stages.length} 段（正文自述 ${declared} 段）${stages.length === declared ? '，对账一致' : '，对账不一致'}：`);
  stages.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log('');
  console.log(`署款：${sealLine(md)}`);
  console.log('  年号给朝代与在位年，干支给六十年一轮的位置，两者对上，年份才定得死。');
  console.log('');
  console.log(`序跋·医案卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：③栏是否只有可核项，⑤栏是否分出评语，⑦栏是否写出不做什么。`);
  console.log('※ 项数、段数、栏数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, prefaceItems, caseSkeleton, declaredStages, sealLine,
};
