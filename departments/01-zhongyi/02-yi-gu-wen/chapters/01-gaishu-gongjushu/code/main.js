#!/usr/bin/env node
/**
 * 医古文 · 第 1 章 医古文概论与工具书
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/01-gaishu-gongjushu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。章节结构、考核项、六字段、失效模式、引书，全部当场从正文读出；
 * 部首三数（540 / 214 / 201）也从正文原句里取出来再复算一次单调性。
 * 正文改了，脚本跟着改，不存在手打常数过期的问题。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '1';
const SLUG = '01-gaishu-gongjushu';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/01-gaishu-gongjushu';

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 二级标题切段（### 不切，留在所属段里） */
function sections(md) {
  const out = [{ title: '(前言)', text: [] }];
  for (const line of String(md).split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) out.push({ title: m[1], text: [] });
    else out[out.length - 1].text.push(line);
  }
  return out.map((s) => ({ title: s.title, text: s.text.join('\n') }));
}

/** 任意级标题（## 或 ###）下的正文块 */
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

/** 记录卡代码块里的 ①②③ 字段 */
function cardFields(md) {
  const m = /```[\s\S]*?```/.exec(String(md));
  if (!m) throw new Error('正文缺记录卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)]
    .map((x) => ({ no: x[1], name: x[2].trim() }));
}

/** 段首加粗的失效模式名（**以今律古。** …） */
function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

function citations(md) {
  const all = [...String(md).matchAll(/《([^》]+)》/g)].map((m) => m[1]);
  return { total: all.length, unique: [...new Set(all)] };
}

const CN = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function cn2num(s) {
  let base = 0;
  let num = 0;
  for (const ch of String(s)) {
    if (ch === '百') { base += (num || 1) * 100; num = 0; }
    else if (ch === '十') { base += (num || 1) * 10; num = 0; }
    else if (ch in CN) num = CN[ch];
  }
  return base + num;
}

/** 正文里「X部」的部首数，按出现顺序去重后再转成阿拉伯数字 */
function radicalCounts(md) {
  const seen = [];
  for (const m of String(md).matchAll(/([零一二三四五六七八九十百]{2,4})部/g)) {
    const n = cn2num(m[1]);
    if (n >= 100 && !seen.includes(n)) seen.push(n);
  }
  return seen;
}

/** H1 章题：`# 第 1 章 · 查得到不等于引得对…` */
function chapterTitle(md) {
  const m = /^#\s+(.+)$/m.exec(String(md));
  if (!m) throw new Error('正文缺 H1 章题');
  return m[1].trim();
}

function main() {
  const md = readDoc();
  const secs = sections(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));
  const cites = citations(md);
  const radicals = radicalCounts(md);
  const decreasing = radicals.every((n, i) => i === 0 || n < radicals[i - 1]);

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`一级段落 ${secs.length - 1} 节 + 前言；考核项 ${items.length} 条。`);
  console.log('');
  console.log('查检记录字段（正文代码块读出，缺一项就算未查）：');
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log('  共同判据：把训释代回原句，句意通且与全篇一致才算采。');
  console.log('');
  console.log(`部首三数（按正文出现顺序去重）：${radicals.join(' → ')}${decreasing ? '（单调递减，与正文叙述一致）' : '（与正文叙述不一致，需核对）'}`);
  console.log(`引书 ${cites.unique.length} 种 / ${cites.total} 次；其中字书 ${cites.unique.filter((b) => /说文|尔雅|广雅|字典|辞典/.test(b)).length} 种。`);
  console.log('');
  console.log('※ 以上数字全部由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, cardFields, failureModes, citations,
  cn2num, radicalCounts, chapterTitle,
};
