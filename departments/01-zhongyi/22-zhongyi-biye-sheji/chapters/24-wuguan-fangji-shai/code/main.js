#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 24 章 两条筛方路径的差别，用交集与差集说话
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/24-wuguan-fangji-shai/docs/zh.md
 * 数据: 本章正文的母体表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 114／836／246／86 从正文表读出，7.3 药位/方、3.4 药位/味、35.0% 缺口现算。
 * Jaccard 的交集与并集来自两路台账，正文未给，脚本只打印口径与边界，不编数值。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '24-wuguan-fangji-shai';
const NO = 24;
const TITLE = '两条筛方路径的差别，用交集与差集说话';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const formulas = rows.get('方');
const slots = rows.get('药位');
const herbs = rows.get('不同药味');
const missing = rows.get('不在词表');
const perFormula = slots / formulas;
const perHerb = slots / herbs;
const gapShare = (missing / herbs) * 100;
if (Math.abs(perFormula - 7.3) > 0.05) throw new Error('每方药位复算与正文 7.3 不一致');
if (Math.abs(gapShare - 35.0) > 0.05) throw new Error('词表缺口复算与正文 35.0% 不一致');

banner(NO, TITLE);
console.log(`母体：${formulas} 方 · ${slots} 药位 · ${herbs} 味不同药 · ${missing} 味不在词表`);
console.log(`复算：${slots} ÷ ${formulas} = ${perFormula.toFixed(1)} 药位/方；${slots} ÷ ${herbs} = ${perHerb.toFixed(1)} 药位/味`);
console.log(`复算：${missing} ÷ ${herbs} = ${gapShare.toFixed(1)}%（正文 35.0%）`);
console.log(`Jaccard = 交集 ÷ 并集；交集＝两路都命中，并集＝任一路命中。两路台账未生成，正文不预填结果。`);
console.log(`敏感性：按「方内专药数」分层（1 味 vs 3 味以上），并报不同专药表宽窄下的 Jaccard。`);
console.log(`判断：本章只报差异，不判路径优劣；结果是候选方，不是推荐方。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
