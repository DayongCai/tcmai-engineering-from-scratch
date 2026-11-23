#!/usr/bin/env node
/**
 * 中国医学史 · 第 3 章 春秋战国至秦汉：体系的奠基
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/03-chunqiu-qinhan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。马王堆医书篇目、正文自述的种数、十一脉与十二脉的三处差异、
 * 条目卡六栏、三种失效，全部当场从正文读出，并与正文自述当场对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '3';
const SLUG = '03-chunqiu-qinhan';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/03-chunqiu-qinhan';

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
  if (!m) throw new Error('正文缺秦汉医史条目卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 马王堆那一句里列出的医药类篇目（《》计数），与正文自述的「共 N 种」对账 */
function mawangdui(md) {
  const line = String(md).split(/\r?\n/).find((l) => l.includes('马王堆三号汉墓出土帛书与简牍'));
  if (!line) throw new Error('正文缺马王堆简帛一句');
  const tail = line.slice(line.indexOf('：') + 1);
  const stop = tail.indexOf('。');
  const titles = [...(stop < 0 ? tail : tail.slice(0, stop)).matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  const declared = /共\s*(\d+)\s*种/.exec(line);
  return { titles, declared: declared ? Number(declared[1]) : NaN };
}

/** 十一脉与十二脉的三处差异（正文以分号分隔） */
function pulseDiff(md) {
  const text = block(md, '从十一脉到十二脉');
  const line = text.split(/\r?\n/).find((l) => l.includes('数差异：'));
  if (!line) throw new Error('正文缺「数差异」一句');
  const body = line.slice(line.indexOf('数差异：') + 4);
  const end = body.indexOf('。');
  return (end < 0 ? body : body.slice(0, end)).split(/[；;]/).map((s) => s.trim()).filter(Boolean);
}

function main() {
  const md = readDoc();
  const mw = mawangdui(md);
  const diff = pulseDiff(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`马王堆医药类篇目 ${mw.titles.length} 种（正文自述 ${mw.declared} 种）${mw.titles.length === mw.declared ? '，对账一致' : '，对账不一致'}。`);
  console.log(`  首篇 ${mw.titles[0]}；末篇 ${mw.titles[mw.titles.length - 1]}。`);
  console.log('');
  console.log(`十一脉→十二脉的 ${diff.length} 处差异（方向一致：从少到多、从简到繁、从零散到系统）：`);
  diff.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  console.log('');
  console.log(`秦汉条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：③栏是否举出文本内证的具体处，④栏是否写区间，⑤栏是否分开托名与编纂。`);
  console.log('※ 篇目数与差异数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, mawangdui, pulseDiff,
};
