#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 14 章 一证多护不是缺陷，是护理评估的常态
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/14-huli-pinggu-diben/docs/zh.md
 * 数据: 本章正文的母体表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 132／14／208 从正文表读出；9.4 证/族、1.58 次覆盖/证现算。
 * 映射损失不折算成一个漂亮比例，而是显式保留「丢失的鉴别点」列。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '14-huli-pinggu-diben';
const NO = 14;
const TITLE = '一证多护不是缺陷，是护理评估的常态';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const syndromes = rows.get('证');
const families = rows.get('族');
const coverage = rows.get('病证覆盖');
const perFamily = syndromes / families;
const perSyndrome = coverage / syndromes;
if (Math.abs(perFamily - 9.4) > 0.05) throw new Error('每族证数复算与正文 9.4 不一致');
if (Math.abs(perSyndrome - 1.58) > 0.01) throw new Error('每证覆盖复算与正文 1.58 不一致');

banner(NO, TITLE);
console.log(`母体：${syndromes} 证 / ${families} 族 / ${coverage} 次病证覆盖`);
console.log(`复算：${syndromes} ÷ ${families} = ${perFamily.toFixed(1)} 证/族（正文 9.4）`);
console.log(`复算：${coverage} ÷ ${syndromes} = ${perSyndrome.toFixed(2)} 次覆盖/证（正文 1.58）`);
console.log(`映射表必须保留三列：原证名、护理问题、丢失的鉴别点`);
console.log(`判断：多对一是常态，损失体现在鉴别信息；护理问题按动作命名，不声称对接官方标准。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
