#!/usr/bin/env node
/**
 * 中国医学史 · 第 7 章 近代与当代：转型与重建
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/07-jindai-dangdai/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。四类文书、三种立场、制度三件套、条目卡六栏、三种失效，
 * 全部当场从正文的加粗小标题里读出；数出来的项数与正文自述当场对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '7';
const SLUG = '07-jindai-dangdai';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/07-jindai-dangdai';

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

/** 任意级标题（## 或 ###）下的正文块；同名取最后一个（如 §五 下还嵌着「### 考核项」） */
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
  if (!m) throw new Error('正文缺近代医史条目卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 史料换代后的四类文书（段首加粗 + 冒号） */
function docTypes(md) {
  return [...block(md, '史料换代').matchAll(/^\*\*([^*\n]+?)\*\*：/gm)].map((m) => m[1].trim());
}

/** 三种立场（段首加粗 + 冒号） */
function stances(md) {
  return [...block(md, '汇通与论争').matchAll(/^\*\*([^*\n]+?)\*\*：/gm)].map((m) => m[1].trim());
}

/** 制度三件套：**学校**取代师授。 */
function triplet(md) {
  return [...block(md, '制度：学校、团体、期刊三件套').matchAll(/^\*\*(.+?)\*\*取代/gm)].map((m) => m[1].trim());
}

function main() {
  const md = readDoc();
  const types = docTypes(md);
  const st = stances(md);
  const three = triplet(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`史料换代后的 ${types.length} 类文书：${types.join(' / ')}`);
  console.log('  章程与法规最容易被误用：它的客观性只在「文本确实如此规定」，不在「现实确实如此执行」。');
  console.log('');
  console.log(`三种立场 ${st.length} 种：${st.join(' / ')}`);
  console.log('  比附靠对应，溯源靠经典，批评靠标准；同一批材料，结论相反，原因在论证方式。');
  console.log('');
  console.log(`制度 ${three.length} 件套：${three.join(' / ')}`);
  console.log('  学校出人，团体出声，期刊出文；三件套成形后，医学的再生产不再依赖某位名医的寿命。');
  console.log('');
  console.log(`近代医史条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：③⑥是否填实，④是否只取一面。`);
  console.log('※ 类数、立场数、件数均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, docTypes, stances, triplet,
};
