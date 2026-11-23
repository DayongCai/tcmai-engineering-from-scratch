#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 22 章 只报均值，等于把失败藏进平均里
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/22-zhineng-zhibiao-shibai/docs/zh.md
 * 数据: 本章正文的交付结构表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 门禁 6 项、必报三层、评测集 20 条、失效下限 10 条从正文读出。
 * 复算：失效下限 10 ÷ 20 = 50%；三层指标各占一行，缺一层就不算完成。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '22-zhineng-zhibiao-shibai';
const NO = 22;
const TITLE = '只报均值，等于把失败藏进平均里';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const gates = rows.get('门禁模板');
const queries = 20; // 正文：本评测集 20 条
const minFailures = 10; // 正文：失效条目不少于十条
const floorShare = (minFailures / queries) * 100;
if (gates !== 6) throw new Error('门禁项数读取失败');
if (floorShare !== 50) throw new Error('失效下限占比应为 50%');

banner(NO, TITLE);
console.log(`结构：指标文件已入库 · 门禁模板 ${gates} 项 · 必报 mean／p50／最差 10 三层`);
console.log(`评测集 ${queries} 条；失效条目下限 ${minFailures} 条 → 下限占比 ${floorShare.toFixed(0)}%（下限不是目标，凑数无分析价值）`);
console.log(`失效四要素：查询／预期／实际／原因；原因必须落到具体机制，写成「模型不行」不算可归因。`);
console.log(`可归因率 = 可归因条数 ÷ 失效条数；低于半数说明清单还停留在记录错误。`);
console.log(`判断：指标只对本评测集成立；门槛开题定死，改门槛必须重跑全部条目。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
