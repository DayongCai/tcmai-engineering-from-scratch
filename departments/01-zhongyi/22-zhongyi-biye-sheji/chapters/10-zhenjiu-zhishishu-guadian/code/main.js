#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 10 章 挂点覆盖率的分母没建起来之前，分子毫无意义
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/10-zhenjiu-zhishishu-guadian/docs/zh.md
 * 数据: 本章正文的现状表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 骨架五级已入库、条文 0 条：覆盖率 = 0 ÷ 0 由本脚本显式返回 null，
 * 并打印「不可算」，绝不输出 0% 或 100%。抽样方案 20 条 ÷ 5 级 = 每级 4 条。
 */

'use strict';

const path = require('node:path');
const { readDoc, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '10-zhenjiu-zhishishu-guadian';
const NO = 10;
const TITLE = '挂点覆盖率的分母没建起来之前，分子毫无意义';
const doc = readDoc(SLUG).text;

const clauses = grab(doc, /条文层\s*\|\s*未建\s*\|\s*(\d+)\s*条/, '条文条数');
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 二十: 20 };
const levels = CN[(doc.match(/([一二三四五六七八九十]+)级骨架/) || [])[1]];
const sample = CN[(doc.match(/先切([一二三四五六七八九十]+)条/) || [])[1]];
if (!levels || !sample) throw new Error('正文缺少五级骨架或抽样条数');
const coverage = clauses === 0 ? null : 0 / clauses;
const perLevel = sample / levels;

banner(NO, TITLE);
console.log(`现状：五级骨架已入库 · 条文层 ${clauses} 条 · 挂点表 0 行`);
console.log(`覆盖率 = 已挂条数 ÷ 条文总数 = 0 ÷ ${clauses} → ${coverage === null ? '不可算（分母为 0）' : (coverage * 100).toFixed(1) + '%'}`);
console.log(`抽样方案：${sample} 条 ÷ ${levels} 级 = 每级 ${perLevel} 条，覆盖五个层级，不能全挂在最下层`);
console.log(`纪律：先建分母再谈覆盖率；错挂率必须与覆盖率同时报，挂错了会让覆盖率虚高。`);
console.log(`判断：自动挂点的典型错误是「同义不同级」，抽五条回查层级比看总数更有用。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
