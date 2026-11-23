#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 9 章 补源之前，冲突率只能是零比零
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/09-zhenjiu-shuxue-guishu/docs/zh.md
 * 数据: 本章正文的现状锚点 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 入库 0 部、可建 0 行、冲突 0 条从正文读出。冲突率的分母为 0 时，
 * 本脚本返回 null 并打印「不可算（0/0）」，绝不打印 0%。
 */

'use strict';

const path = require('node:path');
const { readDoc, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '09-zhenjiu-shuxue-guishu';
const NO = 9;
const TITLE = '补源之前，冲突率只能是零比零';
const doc = readDoc(SLUG).text;

const books = grab(doc, /已入库的多教材文本\s*(\d+)\s*部/, '入库教材数');
const rows0 = grab(doc, /可建穴-经行数\s*(\d+)\s*行/, '可建行数');
const conflicts = grab(doc, /冲突清单\s*\|\s*未建\s*\|\s*(\d+)\s*条/, '冲突条数');
const denom = books * rows0;
const rate = denom === 0 ? null : conflicts / denom;

banner(NO, TITLE);
console.log(`现状：多教材文本入库 ${books} 部 · 穴-经表 ${rows0} 行 · 冲突清单 ${conflicts} 条`);
console.log(`知识树 schema 已入库可用，缺的只是多教材文本这一层。`);
console.log(`冲突率 = 冲突穴数 ÷ 可判穴数 = ${conflicts} ÷ ${denom} → ${rate === null ? '不可算（0/0）' : (rate * 100).toFixed(1) + '%'}`);
if (rate === null) console.log('纪律：分母为 0 时写「未建／不可算」，不写 0%；0% 读起来像没有冲突，实际是没查过。');
console.log(`判断：补源清单先登记书名版本、来源渠道、文件校验值，再谈表结构。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
