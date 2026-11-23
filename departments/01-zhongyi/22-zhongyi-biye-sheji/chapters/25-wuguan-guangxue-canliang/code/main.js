#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 25 章 留空与写「无」，在报表里是两件事
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/25-wuguan-guangxue-canliang/docs/zh.md
 * 数据: 本章正文的缺项口径 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 真实光学数据本库无，脚本不填实测值。这里只用参数示例演示口径：
 * 100 行里缺 10 行时，留空当 0 的均值只有显式版的 90%（分母 100 vs 90）。
 */

'use strict';

const path = require('node:path');
const { readDoc, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '25-wuguan-guangxue-canliang';
const NO = 25;
const TITLE = '留空与写「无」，在报表里是两件事';
const doc = readDoc(SLUG).text;

const EXAMPLE_ROWS = 100; // 参数示例，非实测
const EXAMPLE_MISSING = 10; // 参数示例，非实测
const blankAsZeroMean = (EXAMPLE_ROWS - EXAMPLE_MISSING) / EXAMPLE_ROWS;
const affected = EXAMPLE_MISSING; // 若下游把留空当 0，受影响的至少是这些行
const MARKERS = ['未测', '无此项', '不适用'];
const DOWNSTREAM = ['求均值', '分档', '排序', '同比'];

banner(NO, TITLE);
console.log(`示例口径：${EXAMPLE_ROWS} 行中缺 ${EXAMPLE_MISSING} 行；留空当 0 时，均值只剩显式版的 ${(blankAsZeroMean * 100).toFixed(0)}%`);
console.log(`受影响行数 = 两版结果不同的行数；以上示例至少 ${affected} 行受影响，真实行数须由两版脚本跑出。`);
console.log(`缺项标记 ${MARKERS.length} 种：${MARKERS.join('／')}；混成一种「无」会丢失原因。`);
console.log(`下游计算 ${DOWNSTREAM.length} 类：${DOWNSTREAM.join('／')}；只验一种会漏掉分档与排序的偏移。`);
console.log(`判断：填法与算法必须一起改；模板不是实测，本章无真实光学数据。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
