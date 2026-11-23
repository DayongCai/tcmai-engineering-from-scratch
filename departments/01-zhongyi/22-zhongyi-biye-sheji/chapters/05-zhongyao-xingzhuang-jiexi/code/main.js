#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 5 章 药表的价值在缺项说得清，不在味数多
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/05-zhongyao-xingzhuang-jiexi/docs/zh.md
 * 数据: 本章正文的字段表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 287／285／284 从正文表读出，99.3%／98.9%／5 个字段缺口现算；
 * 两种规则的区别（按条 vs 按字段）在本脚本里显式分成两个指标。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '05-zhongyao-xingzhuang-jiexi';
const NO = 5;
const TITLE = '药表的价值在缺项说得清，不在味数多';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const drugs = rows.get('药味');
const qi = rows.get('带气');
const taste = rows.get('带味');
const meridian = rows.get('带归经');
const unresolved = rows.get('严格规则未解析');
const fields = drugs * 3;
const filled = qi + taste + meridian;
const gaps = fields - filled;
const availability = (filled / fields) * 100;
const tasteRate = (taste / drugs) * 100;
const meridianRate = (meridian / drugs) * 100;
const rate1 = (x) => (Math.floor(x * 10) / 10).toFixed(1); // 与正文一致：截到一位小数

if (unresolved !== 0) throw new Error(`严格规则未解析应为 0，正文表记 ${unresolved}`);
if (gaps !== 5) throw new Error(`字段缺口复算 ${gaps} ≠ 正文 5`);
if (Math.abs(tasteRate - 99.3) > 0.1) throw new Error('带味占比复算与正文 99.3% 不一致');
if (Math.abs(meridianRate - 98.9) > 0.1) throw new Error('带归经占比复算与正文 98.9% 不一致');

banner(NO, TITLE);
console.log(`母体：${drugs} 味 × 气／味／归经 3 字段 = ${fields} 个字段值`);
console.log(`带气 ${qi}／${drugs} = ${rate1((qi / drugs) * 100)}%；带味 ${taste}／${drugs} = ${rate1(tasteRate)}%；带归经 ${meridian}／${drugs} = ${rate1(meridianRate)}%`);
console.log(`按条看：严格规则未解析 ${unresolved} 条（报 0 与 5 个缺口并不矛盾）`);
console.log(`按字段看：空缺 = ${fields} − ${filled} = ${gaps} 个；字段可用率 ${filled} ÷ ${fields} = ${availability.toFixed(2)}%`);
console.log(`判断：只报未解析 0 会把 ${gaps} 个洞藏起来；三个数并排写，修饰任何一处都会露馅。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
