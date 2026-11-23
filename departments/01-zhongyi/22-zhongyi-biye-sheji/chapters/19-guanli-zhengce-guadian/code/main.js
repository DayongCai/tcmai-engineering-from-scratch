#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 19 章 条文没登记来源，挂上去也是无出处
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/19-guanli-zhengce-guadian/docs/zh.md
 * 数据: 本章正文的现状表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 政策全文 0 条、已登记 0 份、登记字段至少 3 项从正文读出。
 * 覆盖率与登记完成率的分母均为 0 或未知，脚本返回 null，打印「不可算」，不写 0%。
 */

'use strict';

const path = require('node:path');
const { readDoc, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '19-guanli-zhengce-guadian';
const NO = 19;
const TITLE = '条文没登记来源，挂上去也是无出处';
const doc = readDoc(SLUG).text;

const clauses = grab(doc, /政策全文\s*\|\s*(\d+)\s*条/, '政策全文条数');
const registered = grab(doc, /已登记文书\s*\|\s*(\d+)\s*份/, '已登记份数');
const fields = grab(doc, /登记字段\s*\|\s*至少\s*(\d+)\s*项/, '登记字段数');
const coverage = clauses === 0 ? null : registered / clauses;
const plannedCount = null; // 正文未给「计划纳入」份数，登记完成率不可算
const completion = plannedCount === null ? null : registered / plannedCount;

banner(NO, TITLE);
console.log(`现状：五级骨架已入库 · 政策全文 ${clauses} 条 · 已登记文书 ${registered} 份`);
console.log(`登记字段至少 ${fields} 项：发文机关、文号、文件校验值`);
console.log(`覆盖率 = 已挂条数 ÷ 条文总数 = 0 ÷ ${clauses} → ${coverage === null ? '不可算（分母为 0）' : (coverage * 100).toFixed(1) + '%'}`);
console.log(`登记完成率 = 已登记 ÷ 计划纳入 → ${completion === null ? '不可算（计划纳入数尚未给出）' : completion}`);
console.log(`顺序：先登记、再落条文、最后挂点；未登记的条文不得进入挂点表。`);
console.log(`判断：程序性条款保留未挂类；已废止文件标「仅作历史参考」，不参与现行统计。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
