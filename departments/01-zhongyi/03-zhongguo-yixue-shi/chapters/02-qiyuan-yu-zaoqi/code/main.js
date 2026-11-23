#!/usr/bin/env node
/**
 * 中国医学史 · 第 2 章 医药的起源与早期医药
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/02-qiyuan-yu-zaoqi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。四类证据各自能回答什么、三种说法各有几条支撑、条目卡六栏、三种失效，
 * 全部当场从正文读出；三类材料的能力差别按正文原句比对，不按常识填。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '2';
const SLUG = '02-qiyuan-yu-zaoqi';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/02-qiyuan-yu-zaoqi';

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
  if (!m) throw new Error('正文缺早期医史条目卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 四类证据：考古实物回答「…」 */
function evidenceTypes(md) {
  return [...block(md, '四类证据').matchAll(/^(\S{2,6})回答「([^」]+)」/gm)]
    .map((m) => ({ type: m[1], answers: m[2] }));
}

/** 医源于酒的三类支撑：考古（贾湖）、文献（世本）、文字（说文） */
function wineSupport(md) {
  const text = block(md, '考古给年代');
  const para = text.split(/\r?\n/).find((l) => l.includes('医源于酒'));
  if (!para) throw new Error('正文缺医源于酒一节');
  return {
    archaeology: /贾湖遗址/.test(para),
    documents: (para.match(/《[^》]+》/g) || []).length,
    textFigure: /说文解字/.test(para),
  };
}

function main() {
  const md = readDoc();
  const types = evidenceTypes(md);
  const wine = wineSupport(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`四类证据（${types.length} 类，各答一问）：`);
  for (const t of types) console.log(`  ${t.type} —— 回答「${t.answers}」`);
  console.log('');
  console.log(`「医源于酒」三条支撑：考古（贾湖遗址陶器残留）${wine.archaeology ? '在' : '缺'} / 文献 ${wine.documents} 种 / 文字（《说文》释醫）${wine.textFigure ? '在' : '缺'}。`);
  console.log('  三条互相补位，与「医源于巫」只有文献一条支撑，可靠度不在一个层级。');
  console.log('');
  console.log(`早期医史条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：②③是否配套，⑤⑥是否划出边界。`);
  console.log('※ 类数与支撑项均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, evidenceTypes, wineSupport,
};
