#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 8 章 底本从零建，先算「还没有的东西」值多少
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/08-zhenjiu-jingluo-diben/docs/zh.md
 * 数据: 本章正文的参照端锚点 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 384 单元／329,826 字／858.9 字/单元／23,040 元／107,400 元从正文读出并复算；
 * 两个价差 4.7 倍由除法现算，并显式区分「单元已切好」与「含建文本层」两个阶段。
 */

'use strict';

const path = require('node:path');
const { readDoc, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '08-zhenjiu-jingluo-diben';
const NO = 8;
const TITLE = '底本从零建，先算「还没有的东西」值多少';
const doc = readDoc(SLUG).text;

const units = grab(doc, /参照口径\s*(\d+)\s*单元/, '参照单元数');
const hanziTotal = grab(doc, /单元、\s*([\d,]+)\s*汉字/, '参照汉字数');
const mean = grab(doc, /平均每单元\s*([\d.]+)\s*字/, '每单元均值');
const unitPrice = grab(doc, /单元 ×\s*(\d+)\s*元/, '每单元计价');
const quoted = grab(doc, /单元折\s*([\d,]+)\s*元/, '按单元折算价');
const debt = grab(doc, /欠账清单记\s*([\d,]+)\s*元占位/, '欠账占位价');

const recomputedMean = hanziTotal / units;
const recomputedQuoted = units * unitPrice;
const ratio = debt / quoted;
if (Math.abs(recomputedMean - mean) > 0.05) throw new Error(`每单元均值复算 ${recomputedMean.toFixed(1)} ≠ 正文 ${mean}`);
if (recomputedQuoted !== quoted) throw new Error(`按单元折算价复算 ${recomputedQuoted} ≠ 正文 ${quoted}`);
if (Math.abs(ratio - 4.7) > 0.05) throw new Error('两价差复算与正文 4.7 倍不一致');

banner(NO, TITLE);
console.log(`参照端：${units} 单元 · ${hanziTotal.toLocaleString('en-US')} 汉字`);
console.log(`复算：${hanziTotal.toLocaleString('en-US')} ÷ ${units} = ${recomputedMean.toFixed(1)} 字/单元（正文 858.9）`);
console.log(`已切好口径：${units} × ${unitPrice} 元 = ${recomputedQuoted.toLocaleString('en-US')} 元`);
console.log(`未建文本层口径：欠账占位 ${debt.toLocaleString('en-US')} 元（状态不可计）`);
console.log(`复算：${debt.toLocaleString('en-US')} ÷ ${recomputedQuoted.toLocaleString('en-US')} = ${ratio.toFixed(1)} 倍（正文 4.7）`);
console.log(`判断：两个价是两个阶段的数，不能混用；底本 0 门时只报 0，不报覆盖率。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
