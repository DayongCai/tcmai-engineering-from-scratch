#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 20 章 检索栈能重建，才算编码翻译层
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/20-zhineng-icd-jiansuo/docs/zh.md
 * 数据: 本章正文的资产与查询集表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 8 件资产、20 条查询从正文表读出；每条查询对召回率的权重 1/20 = 5% 现算；
 * 候选条数 3–5 与 k 的关系在这里写死，提醒论文必须报 k。命中条数正文未给，不编。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '20-zhineng-icd-jiansuo';
const NO = 20;
const TITLE = '检索栈能重建，才算编码翻译层';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const assets = rows.get('ICD-11 资产');
const queries = rows.get('查询集');
const perQuery = 100 / queries;
const candidates = [3, 5]; // 正文：返三到五条候选
if (assets !== 8 || queries !== 20) throw new Error('资产或查询集读取失败');
if (perQuery !== 5) throw new Error('单条查询对召回的权重应为 5%');

banner(NO, TITLE);
console.log(`资产 ${assets} 件（含 tm1 子目录）· 查询集 ${queries} 条（含同义与近义）`);
console.log(`复算：每命中 1 条 = 1 ÷ ${queries} = ${perQuery.toFixed(0)}% 召回；命中条数须由台账数出，正文未给，不预填。`);
console.log(`候选条数 ${candidates[0]}–${candidates[1]} 条；召回按前 k 条内命中的口径，k 必须在论文写明。`);
console.log(`延迟报 p50 与最慢 10 条，不报平均值了事；镜像版本写进索引文件名，否则重建结果不可复现。`);
console.log(`判断：同义表述可改善，近似关系不能直接等同；检索栈是辅助工具，不是编码决策。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
