#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 16 章 忌比宜难写，因为「忌」必须能勾选
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/16-huli-yangsheng-fangan/docs/zh.md
 * 数据: 本章正文的对象池表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 132 证 × 每证 2 忌 2 宜 = 528 条由正文表读出现算；忌与宜各占一半。
 * 可勾选率依赖真实填写，正文未给，脚本只打印「待统计」，不编一个数。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '16-huli-yangsheng-fangan';
const NO = 16;
const TITLE = '忌比宜难写，因为「忌」必须能勾选';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const syndromes = rows.get('证');
const tabooPer = rows.get('每证忌条');
const goodPer = rows.get('每证宜条');
const required = rows.get('需判据条目');
const computed = syndromes * (tabooPer + goodPer);
const tabooShare = (syndromes * tabooPer) / computed * 100;
if (computed !== required) throw new Error(`132 × 4 复算 ${computed} ≠ 正文 ${required}`);
if (tabooShare !== 50) throw new Error('忌条目占比复算与 2 忌 2 宜的设定不一致');

banner(NO, TITLE);
console.log(`对象池：${syndromes} 证 × 每证 ${tabooPer} 忌 + ${goodPer} 宜 = ${computed} 条需判据（正文 ${required}）`);
console.log(`复算：忌条目 ${syndromes * tabooPer} ÷ ${computed} = ${tabooShare.toFixed(0)}%；宜条目同此`);
console.log(`可勾选率 = 可勾选条目 ÷ 总条目：${required} 条未逐条试勾，正文未给数，标「待统计」，不编比例。`);
console.log(`句式：忌写「今日未（动作）」，宜写「今日已（动作）达到（可观察标准）」；把形容词换成动作，把程度换成数量。`);
console.log(`判断：本章只做方案可执行性，不做疗效结论；结尾不得写「改善体质」。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
