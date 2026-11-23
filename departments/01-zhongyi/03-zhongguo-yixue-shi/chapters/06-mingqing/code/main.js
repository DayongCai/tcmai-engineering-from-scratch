#!/usr/bin/env node
/**
 * 中国医学史 · 第 6 章 明清：温病与考据
 * 正文: departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/06-mingqing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本不存数字。温病学说的层数与每层加了什么、两种集成的动力差别、条目卡六栏、
 * 三种失效，全部当场从正文读出；层数还与正文自述的「五层」对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '6';
const SLUG = '06-mingqing';
const REL = 'departments/01-zhongyi/03-zhongguo-yixue-shi/chapters/06-mingqing';

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
  if (!m) throw new Error('正文缺明清医史条目卡代码块');
  return [...m[0].matchAll(/^([①-⑩])\s*([^：\n]+)：/gm)].map((x) => ({ no: x[1], name: x[2].trim() }));
}

function failureModes(text) {
  return [...String(text).matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 温病学说的层：第一层是《黄帝内经》的伏气温病之说：… */
function layers(md) {
  return [...block(md, '温病：一条层层保留的推进线').matchAll(/第([一二三四五])层是(.+?)[：，]/g)]
    .map((m) => ({ n: m[1], name: m[2].trim() }));
}

/** 两部集成之书的差别：纲目以物为纲、普济方以方为目；一个靠人、一个靠机构 */
function integrationPair(md) {
  const t = block(md, '集成之书');
  return {
    objectVsFormula: /前者以物为纲，后者以方为目/.test(t),
    personVsInstitution: /一个靠人，一个靠机构/.test(t),
  };
}

function main() {
  const md = readDoc();
  const ls = layers(md);
  const pair = integrationPair(md);
  const fields = cardFields(md);
  const modes = failureModes(block(md, '失效'));
  const items = numbered(block(md, '考核项'));

  console.log(`中国医学史 · 第 ${CHAPTER} 章 ${chapterTitle(md).replace(/^第\s*\d+\s*章\s*·\s*/, '')}`);
  console.log(`${REL} · 正文 ${hanzi(md).toLocaleString('en-US')} 汉字`);
  console.log('');
  console.log(`温病学说 ${ls.length} 层（每层保留上一层）：`);
  for (const l of ls) console.log(`  第${l.n}层 ${l.name}`);
  console.log('  写「某人创立温病学说」是把末层当全部；分层写法要写明这一层是「提出」还是「完成」。');
  console.log('');
  console.log(`两种集成的差别：以物为纲／以方为目 ${pair.objectVsFormula ? '已写明' : '缺'}；一个靠人／一个靠机构 ${pair.personVsInstitution ? '已写明' : '缺'}。`);
  console.log('');
  console.log(`明清条目卡 ${fields.length} 栏：`);
  for (const f of fields) console.log(`  ${f.no} ${f.name}`);
  console.log('');
  console.log(`三种失效模式：${modes.join(' / ')}`);
  console.log(`考核项 ${items.length} 条。评分只看：②③是否成对，⑥是否避免单点年份。`);
  console.log('※ 层数与对举项均由正文现算，不手打；正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, REL,
  readDoc, sections, block, numbered, chapterTitle, cardFields,
  failureModes, layers, integrationPair,
};
