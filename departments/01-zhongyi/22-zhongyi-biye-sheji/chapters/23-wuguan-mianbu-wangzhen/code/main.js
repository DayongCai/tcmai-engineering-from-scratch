#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 23 章 「神疲」写不进字段，就别硬塞进形态
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/23-wuguan-mianbu-wangzhen/docs/zh.md
 * 数据: 本章正文的资产与字段表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 18 件资产、132 证、4 类字段从正文读出；四类各写 3–5 个子字段 →
 * 子字段总数落在 12–20 之间，这是现算的结构区间，不是填出来的数。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '23-wuguan-mianbu-wangzhen';
const NO = 23;
const TITLE = '「神疲」写不进字段，就别硬塞进形态';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const assets = rows.get('对接资产');
const syndromes = rows.get('对象池');
const classes = rows.get('字段类');
const subMin = classes * 3;
const subMax = classes * 5;
if (assets !== 18 || syndromes !== 132 || classes !== 4) throw new Error('资产／对象池／字段类读取失败');
if (subMin !== 12 || subMax !== 20) throw new Error('子字段区间应为 12–20');

banner(NO, TITLE);
console.log(`资产 ${assets} 件 · 对象池 ${syndromes} 证 · 字段 ${classes} 类（部位／颜色／形态／光泽）`);
console.log(`复算：每类 3–5 个子字段 → 子字段总数 ${classes}×3 至 ${classes}×5 = ${subMin}–${subMax} 个`);
console.log(`可观察判定：双人同值；分歧条目保留两种判断，不强行归一。`);
console.log(`可字段化率 = 可字段化条数 ÷ 总条目；分歧率 = 分歧条数 ÷ 已归类条数，分母要写清。`);
console.log(`判断：「神疲」不进四类字段；本章只用文本、无图像，字段化是图像分析的前置，不替代图像识别。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
