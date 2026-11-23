#!/usr/bin/env node
/**
 * 中国医学史 · 第 8 章 少数民族医学、中外交流与数字化
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/08-shaoshu-jiaoliu-shuzi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。三类对象各自的缺口、五种民族医学、数字化的三条限度、条目卡六栏、
 * 三种失效，全部当场从正文的表与加粗句里读出。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '8';
const SLUG = '08-shaoshu-jiaoliu-shuzi';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/08-shaoshu-jiaoliu-shuzi';

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

/** 任意级标题下的正文块；同名取最后一个（§五 下还嵌着「### 考核项」） */
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
  return String(text).split('\n')
    .map((l) => l.trim())
    .map((l) => /^\d+\.\s+(.+)$/.exec(l))
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
  if (!m) throw new Error('正文缺跨域医史条目卡代码块');
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

/** 三类对象：对象 / 一手材料形态 / 本课程能读到的 / 缺口在哪 */
function objects(md) {
  const t = tables(block(md, '三类对象'))[0];
  if (!t) throw new Error('三类对象表不存在');
  return t.slice(1).map((r) => ({ name: r[0], primary: r[1], weRead: r[2], gap: r[3] }));
}

/** 五种民族医学（段首加粗） */
function medicines(md) {
  return [...block(md, '五种民族医学').matchAll(/^\*\*([^*\n]+?医学)\*\*/gm)].map((m) => m[1].trim());
}

/** 数字化的三条限度：其一，**库的底本不可见**。 */
function limits(md) {
  return [...block(md, '二次加工的限度').matchAll(/其[一二三]，\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
}

function main() {
  const md = readDoc();
  const objs = objects(md);
  const meds = medicines(md);
  const lim = limits(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`三类对象与各自的缺口（${objs.length} 类）：`);
  for (const o of objs) console.log(`  ${o.name} —— 缺口：${o.gap}`);
  console.log('  三种缺口使「转述」成为唯一路径；转述层材料只能证「有人这样概括」，不能证「原文如此」。');
  console.log('');
  console.log(`五种民族医学 ${meds.length} 种：${meds.join(' / ')}`);
  console.log('  「少数民族医学」是一个现代分类，不是这些医学自己的自我认定；讲任何一种，先问它的文本载体是什么。');
  console.log('');
  console.log(`数字化的 ${lim.length} 条限度：${lim.join(' / ')}`);
  console.log('  共同点是：数字化产品交给你的是结论，不是过程；不能回核的资源，只能当线索。');
  console.log('');
  console.log(`跨域医史条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：②③是否填实，⑥是否给出可执行的校验路径。`);
  console.log('※ 类数、种数、限度数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, tables, objects, medicines, limits,
};
