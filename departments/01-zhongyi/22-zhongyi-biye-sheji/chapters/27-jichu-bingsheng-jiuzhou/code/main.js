#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 27 章 一条单元打三个轴，覆盖率就会虚高
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/27-jichu-bingsheng-jiuzhou/docs/zh.md
 * 数据: 本章正文的规模与轴口径 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 216 单元、360,945 字、9 轴从正文表读出；216 与 360,945 相除得 1,671.0 字/单元。
 * 覆盖率分母固定为 216；最拥挤轴阈值三成 → 216 × 0.3 = 64.8，取 65 个单元。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '27-jichu-bingsheng-jiuzhou';
const NO = 27;
const TITLE = '一条单元打三个轴，覆盖率就会虚高';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const units = rows.get('单元');
const hanziTotal = rows.get('汉字');
const axes = rows.get('轴');
const mean = hanziTotal / units;
const crowdLimit = units * 0.3;
const maxTags = units * 2; // 正文：多轴最多打两个
if (Math.abs(mean - 1671.0) > 0.05) throw new Error('每单元均值复算与正文 1,671.0 不一致');
if (axes !== 9) throw new Error('轴数应为 9');

banner(NO, TITLE);
console.log(`规模：${units} 单元 · ${hanziTotal.toLocaleString('en-US')} 汉字 · ${axes} 条机制轴 · 数值 ${rows.get('数值')}`);
console.log(`复算：${hanziTotal.toLocaleString('en-US')} ÷ ${units} = ${mean.toFixed(1)} 字/单元（正文 1,671.0）`);
console.log(`覆盖率分母固定 ${units}：最大 100%；若把标签数相加，最多 ${maxTags} 个标签，除出来会超过 100%（虚高）。`);
console.log(`最拥挤轴阈值 30% → ${units} × 0.3 = ${crowdLimit.toFixed(1)}，约 ${Math.ceil(crowdLimit)} 个单元；超过就要考虑拆轴。`);
console.log(`两个硬判据：空轴数与最拥挤轴占比；空轴为 0、最拥挤轴不超三成，覆盖才算合理。`);
console.log(`判断：九轴来自该课既有约定，本章不论证为什么是九条；统计只描述内容分布，不作质量评价。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
