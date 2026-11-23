#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 4 章 四十九万字里，先分清是哪一个范畴的密度
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/04-zhongyi-zhexue-fanchou/docs/zh.md
 * 数据: 本章正文的母体表与四范畴示范表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 162 篇、490,232 字与四个范畴次数从正文表里读；
 * 221.4／30.2／2.6／0.6 每万字密度与 84.1 倍差全部现算；回本 90.3 个月由案例库参数重算。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '04-zhongyi-zhexue-fanchou';
const NO = 4;
const TITLE = '四十九万字里，先分清是哪一个范畴的密度';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const pian = rows.get('篇');
const hanziTotal = rows.get('汉字');
const cat = { 气: rows.get('气'), 道: rows.get('道'), 五行: rows.get('五行'), 临床: rows.get('临床') };
const density = (n) => (n / hanziTotal) * 10000;
const ratio = cat['气'] / cat['五行'];
if (Math.abs(density(cat['气']) - 221.4) > 0.1) throw new Error('气密度复算与正文 221.4 不一致');
if (Math.abs(ratio - 84.1) > 0.1) throw new Error('气/五行倍数与正文 84.1 不一致');

banner(NO, TITLE);
console.log(`母体：${pian} 篇 · ${hanziTotal.toLocaleString('en-US')} 汉字；密度口径 = 次数 ÷ 字数 × 10,000`);
for (const [k, v] of Object.entries(cat)) {
  console.log(`  ${k}\t${String(v).padStart(6)} 次\t${density(v).toFixed(1)} 次/万字`);
}
console.log(`复算：${cat['气'].toLocaleString('en-US')} ÷ ${cat['五行']} = ${ratio.toFixed(1)} 倍（正文 84.1）`);
console.log(`复算：${cat['气'].toLocaleString('en-US')} ÷ ${hanziTotal.toLocaleString('en-US')} × 10000 = ${density(cat['气']).toFixed(1)}（正文 221.4）`);
console.log(`判断：倍数差一半来自词义宽度——气是多义词，五行近乎专名；单字结论必须让位于多字结论。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
