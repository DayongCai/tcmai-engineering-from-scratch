#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 11 章 底本可以迁移，章轴必须重算
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/11-gushang-gubing-qianyi/docs/zh.md
 * 数据: 本章正文的母体与四轴表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 60 单元、149,316 字与四轴不均衡度从正文表读出；
 * 2,488.6 字/单元、最不均与最均 8 倍差全部现算；迁移完整率必须等于 1。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '11-gushang-gubing-qianyi';
const NO = 11;
const TITLE = '底本可以迁移，章轴必须重算';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const units = rows.get('单元');
const hanziTotal = rows.get('汉字');
const axes = [
  ['轴一（解剖部位）', rows.get('轴一（解剖部位）')],
  ['轴二（病名序列）', rows.get('轴二（病名序列）')],
  ['轴三（治法分类）', rows.get('轴三（治法分类）')],
  ['轴四（病性四分）', rows.get('轴四（病性四分）')],
];
const mean = hanziTotal / units;
const worst = Math.max(...axes.map(([, v]) => v));
const best = Math.min(...axes.map(([, v]) => v));
const spread = worst / best;
if (Math.abs(mean - 2488.6) > 0.1) throw new Error('每单元均值复算与正文 2,488.6 不一致');
if (Math.abs(spread - 8) > 0.1) throw new Error('最不均/最均倍数与正文约 8 倍不一致');

banner(NO, TITLE);
console.log(`母体：${units} 单元 · ${hanziTotal.toLocaleString('en-US')} 汉字 · 数值 ${rows.get('数值')}`);
console.log(`复算：${hanziTotal.toLocaleString('en-US')} ÷ ${units} = ${mean.toFixed(1)} 字/单元（正文 2,488.6）`);
console.log('四轴不均衡度（最大章 ÷ 最小章）：');
for (const [name, v] of axes) console.log(`  ${name}\t${v}×`);
console.log(`复算：${worst} ÷ ${best} = ${spread.toFixed(1)} 倍（正文约 8 倍）`);
console.log(`采用 ${best}× 的病性四分；迁移完整率 = 迁移后单元数 ÷ ${units}，必须等于 1，不等于 1 就是丢单元。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
