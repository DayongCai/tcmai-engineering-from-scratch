#!/usr/bin/env node
/**
 * 口腔颌面外科 · 第 5 章：三法管时间，刀管空间，外治管界面
 * 正文: chapters/05-e115/docs/zh.md
 * 做法: 从正文解析内治三法、外治的三道窄门、手术的三个「不能」与三问。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '消托补管时间，刀管空间：两套手段不能互相代付';

function docText() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  const marks = [...text.matchAll(/^## (.+)$/gm)];
  return marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { title: m[1].trim(), body: text.slice(start, end) };
  });
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const methods = ['消法', '托法', '补法'].filter((m) => text.includes(m));
  const gates = [...text.matchAll(/\*\*第[一二三]道窄门是(.+?)。\*\*/g)].map((m) => m[1]);
  const cannots = [...text.matchAll(/^\*\*不能(替代诊断|替代病灶处理|在气道未保时进行)。\*\*/gm)].map((m) => `不能${m[1]}`);
  const asks = [...text.matchAll(/\*\*第[一二三]问：(.+?)\*\*/g)].map((m) => m[1]);
  const formulas = ['五味消毒饮', '黄连解毒汤', '仙方活命饮'].filter((f) => text.includes(f));
  return {
    title: TITLE,
    sections: secs.map((s) => s.title),
    methods,
    gates,
    cannots,
    asks,
    formulas,
    noDose: /不给[\s\S]{0,20}剂量/.test(text)
  };
}

function report(a) {
  console.log(`口腔颌面外科 · 第 5 章 ${a.title}`);
  console.log('');
  console.log(`内治三法（对应病程三段）：${a.methods.join(' → ')}`);
  console.log(`外治三道窄门：${a.gates.join(' / ')}`);
  console.log(`手术三个不能：${a.cannots.join('；')}`);
  console.log('');
  console.log('三问：');
  for (const q of a.asks) console.log(`  ${q}`);
  console.log('');
  console.log(`代表方只留名（${a.formulas.length} 首）：${a.formulas.join('、')}`);
  console.log(`是否明写不给剂量：${a.noDose ? '是' : '否'}`);
  console.log('');
  console.log('※ 以上由本章正文现算；方药组成、剂量与操作参数一并不给，以规范与药典为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, analyze };
