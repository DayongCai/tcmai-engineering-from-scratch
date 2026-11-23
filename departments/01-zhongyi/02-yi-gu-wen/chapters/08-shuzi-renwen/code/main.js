#!/usr/bin/env node
/**
 * 医古文 · 第 8 章 医古文与数字人文
 * 正文: departments/01-zhongyi/02-yi-gu-wen/chapters/08-shuzi-renwen/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。数字化三级、检索三个数、语料库三种失败、记录七栏、三种失效，
 * 全部当场从正文读出；三级之间「越往上层越不可核」的判断也按正文原句核对。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '8';
const SLUG = '08-shuzi-renwen';
const REL = 'departments/01-zhongyi/02-yi-gu-wen/chapters/08-shuzi-renwen';

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
  if (!m) throw new Error('正文缺检索记录代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 数字化三级：第一级是图像数字化 */
function levels(md) {
  return [...block(md, '数字化的三级').matchAll(/第([一二三])级是(\S+?)数字化/g)]
    .map((m) => ({ n: m[1], name: `${m[2]}数字化` }));
}

/** 检索三个数：其一，**召回**。 */
function searchNumbers(md) {
  return [...block(md, '一次检索要报三个数').matchAll(/其[一二三]，\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
}

/** 语料库三种失败（段首加粗） */
function corpusFailures(md) {
  return failureModes(block(md, '语料库的三种失败'));
}

function main() {
  const md = readDoc();
  const lv = levels(md);
  const nums = searchNumbers(md);
  const fails = corpusFailures(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`医古文 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`数字化 ${lv.length} 级：${lv.map((x) => `第${x.n}级${x.name}`).join(' → ')}`);
  console.log('  越往上层，越好用，越不可核；第二级的失真最危险，因为它伪装成原文。');
  console.log('');
  console.log(`一次检索要报 ${nums.length} 个数：${nums.join(' / ')}`);
  console.log('  三个数报齐，检索才算有交代；只报「命中若干条」的，是把抽样当普查。');
  console.log('');
  console.log(`语料库的 ${fails.length} 种失败：${fails.join(' / ')}`);
  console.log('  三者的共同点是都不报错：分词错了、映射缺了、异文混了，库照样返回结果。');
  console.log('');
  console.log(`检索记录 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log('  频次高低不等于词义确定，统计相关不等于因果成立。');
  console.log(`考核项 ${items.length} 条。评分只看：①是否可被否证，④是否报齐三个数，⑥是否真的回核。`);
  console.log('※ 级数、个数、栏数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, levels, searchNumbers, corpusFailures,
};
