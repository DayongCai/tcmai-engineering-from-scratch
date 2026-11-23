#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 6 章 方剂对账先认药位，再谈配伍
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/06-zhongyao-fangji-yaowei/docs/zh.md
 * 数据: 本章正文的母体表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 114／836／246／86／18 从正文表读出，7.3 个药位/方、3.4 个药位/味、35.0% 缺口语义
 * 与 15.8% 角色完整占比全部现算；回本 18.8 个月由案例库参数重算。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '06-zhongyao-fangji-yaowei';
const NO = 6;
const TITLE = '方剂对账先认药位，再谈配伍';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const formulas = rows.get('方');
const slots = rows.get('药位');
const herbs = rows.get('不同药味');
const missing = rows.get('不在 287 词表');
const roleComplete = rows.get('角色完整方');

const perFormula = slots / formulas;
const perHerb = slots / herbs;
const gapShare = (missing / herbs) * 100;
const roleShare = (roleComplete / formulas) * 100;
if (Math.abs(perFormula - 7.3) > 0.05) throw new Error('每方药位复算与正文 7.3 不一致');
if (Math.abs(gapShare - 35.0) > 0.05) throw new Error('词表缺口占比复算与正文 35.0% 不一致');
if (Math.abs(roleShare - 15.8) > 0.05) throw new Error('角色完整占比复算与正文 15.8% 不一致');

banner(NO, TITLE);
console.log(`母体：${formulas} 方 → ${slots} 个药位 → ${herbs} 味不同药`);
console.log(`复算：${slots} ÷ ${formulas} = ${perFormula.toFixed(1)} 药位/方（正文 7.3）`);
console.log(`复算：${slots} ÷ ${herbs} = ${perHerb.toFixed(1)} 药位/味（正文 3.4）`);
console.log(`缺口：${missing} 味不在 287 词表 ÷ ${herbs} 味 = ${gapShare.toFixed(1)}%（正文 35.0%）`);
console.log(`角色：${roleComplete} 方角色完整 ÷ ${formulas} 方 = ${roleShare.toFixed(1)}%，不足两成，不能做配伍角色分析`);
console.log(`判断：三类判别（别名／新药／噪声）先做，覆盖率才拆得清；药名对账不等于药理对账。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
