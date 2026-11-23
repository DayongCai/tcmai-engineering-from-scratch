#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 1 章 通用流程与基本要求
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/01-tongyong-liucheng/docs/zh.md
 * 数据: 本章 docs/zh.md 的案例数与金额；公共复算函数见 ../_chapter.js
 * 依赖: 仅 Node.js 标准库
 *
 * 正文里的 27／11／16、881,400、727,356、1,318,400 与 −44.8% 不手打：
 * 一律由本脚本从正文读出原始数，再按正文给出的减法与百分比口径重算。
 */

'use strict';

const path = require('node:path');
const { readDoc, grab, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '01-tongyong-liucheng';
const NO = 1;
const TITLE = '通用流程与基本要求';
const doc = readDoc(SLUG).text;

const total = grab(doc, /PROBLEM:\*\*\s*(\d+)\s*个案例里/, '案例总数');
const missing = grab(doc, /个案例里\s*(\d+)\s*个缺底本/, '缺底本案数');
const debt = grab(doc, /占位\s*¥([\d,]+)/, '欠账占位金额');
const fine = grab(doc, /细口径\s*¥([\d,]+)/, '细口径合计');
const coarse = grab(doc, /粗口径\s*¥([\d,]+)/, '粗口径合计');
const statedGap = grab(doc, /相差\s*[−-]\s*([\d.]+)%/, '两口径差幅');

const countable = total - missing;
const gap = ((fine - coarse) / coarse) * 100;
const perMissing = debt / missing;
const perFine = fine / countable;
const perCoarse = coarse / countable;

if (Math.abs(gap - -statedGap) > 0.05) {
  throw new Error(`两口径差幅复算 ${gap.toFixed(1)}% 与正文 ${-statedGap}% 不一致`);
}

banner(NO, TITLE);
console.log(`案例口径：${total} 案 = 可计 ${countable} + 缺底本 ${missing}`);
console.log(`欠账占位 ¥${debt.toLocaleString('en-US')} ÷ ${missing} 案 = 每案 ¥${perMissing.toLocaleString('en-US', { maximumFractionDigits: 1 })}`);
console.log(`可计 ${countable} 案：细口径 ¥${fine.toLocaleString('en-US')}（均 ¥${perFine.toLocaleString('en-US', { maximumFractionDigits: 1 })}）`);
console.log(`                  粗口径 ¥${coarse.toLocaleString('en-US')}（均 ¥${perCoarse.toLocaleString('en-US', { maximumFractionDigits: 1 })}）`);
console.log(`复算：(${fine.toLocaleString('en-US')} − ${coarse.toLocaleString('en-US')}) ÷ ${coarse.toLocaleString('en-US')} = ${gap.toFixed(1)}%`);
console.log(`结论：同一条「能不能重跑」，让 ${missing} 案只能记欠账；可计的 ${countable} 案里，口径一换就差 ${Math.abs(gap).toFixed(1)}%。`);

const audit = auditQuiz(SLUG, doc);
finish(SLUG, null, audit);
