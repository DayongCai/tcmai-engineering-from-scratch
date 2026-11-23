#!/usr/bin/env node
/**
 * 中国医学史 · 第 1 章 绪论：医学史的问题与方法
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/01-xulun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。两套分期的段数、史料四级的级别名与用途、条目卡六栏、三种失效，
 * 全部当场从正文读出；段数还与正文自述的「五段」「九段」当场对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '1';
const SLUG = '01-xulun';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/01-xulun';

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn = (c) => CN[c] || NaN;

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
  if (!m) throw new Error('正文缺医史条目卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 两套分期各自的段数：社会形态五段、学术脉络九段 */
function periodSchemes(md) {
  const social = /按社会形态分(.)段/.exec(md);
  const academic = /按学术自身脉络分(.)段/.exec(md);
  if (!social || !academic) throw new Error('正文缺两套分期的段数');
  return { social: cn(social[1]), academic: cn(academic[1]) };
}

/** 史料四级：第一级是**一手文献** */
function materialLevels(md) {
  return [...String(md).matchAll(/第([一二三四])级是\*\*([^*]+)\*\*/g)]
    .map((m) => ({ n: m[1], name: m[2].trim() }));
}

/** 每级能证什么：第一级能证「有什么」 */
function levelUses(md) {
  return [...String(md).matchAll(/第([一二三四])级能证「([^」]+)」/g)]
    .map((m) => ({ n: m[1], use: m[2].trim() }));
}

function main() {
  const md = readDoc();
  const schemes = periodSchemes(md);
  const levels = materialLevels(md);
  const uses = levelUses(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`两套分期：社会形态 ${schemes.social} 段 / 学术脉络 ${schemes.academic} 段；课程只有 8 章，只能选一条线并合并。`);
  console.log('');
  console.log(`史料 ${levels.length} 级（级别决定它能证明什么）：`);
  for (const l of levels) {
    const u = uses.find((x) => x.n === l.n);
    console.log(`  第${l.n}级 ${l.name} —— 能证「${u ? u.use : '—'}」`);
  }
  console.log('');
  console.log(`医史条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：③④⑤三栏是否填实，⑥栏是否写出「不可证」的一面。`);
  console.log('※ 段数、级数、栏数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, periodSchemes, materialLevels, levelUses,
};
