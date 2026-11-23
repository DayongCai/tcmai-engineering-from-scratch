#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 15 章 交接班留空不是省事，是把风险留给下一班
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/15-huli-jiaoban-sbar/docs/zh.md
 * 数据: 本章正文的口径表与台账示例 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 38 病／190 动作／5 栏从正文表读出；每病 5 个动作现算。
 * 台账示例 12 项应填、9 项实填、2 项写无、1 项未获取：留空率与「无」占比全部现算。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '15-huli-jiaoban-sbar';
const NO = 15;
const TITLE = '交接班留空不是省事，是把风险留给下一班';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const diseases = rows.get('病');
const actions = rows.get('动作');
const columns = rows.get('五栏');
const should = grab(doc, /应填项\s*\|[^|]*\|\s*(\d+)/, '应填项');
const actual = grab(doc, /实填项\s*\|[^|]*\|\s*(\d+)/, '实填项');
const noneCount = grab(doc, /缺项栏「无」\s*\|[^|]*\|\s*(\d+)/, '缺项栏写无');
const notGot = grab(doc, /未获取\s*\|[^|]*\|\s*(\d+)/, '未获取');

const perDisease = actions / diseases;
const blankRate = ((should - actual) / should) * 100;
const noneShare = (noneCount / should) * 100;
const notGotShare = (notGot / should) * 100;
if (Math.abs(perDisease - 5) > 0.1) throw new Error('每病动作数复算与正文约 5 个不一致');
if (blankRate !== 25) throw new Error('留空率复算与台账示例不一致');

banner(NO, TITLE);
console.log(`口径：${diseases} 病 · ${actions} 个动作 · 每病 ${perDisease.toFixed(1)} 个动作 · 模板 ${columns} 栏`);
console.log(`台账示例：应填 ${should} · 实填 ${actual} · 缺项栏写无 ${noneCount} · 未获取 ${notGot}`);
console.log(`复算：留空率 = (${should} − ${actual}) ÷ ${should} = ${blankRate}%`);
console.log(`复算：「无」占比 = ${noneCount} ÷ ${should} = ${noneShare.toFixed(1)}%；未获取占比 = ${notGot} ÷ ${should} = ${notGotShare.toFixed(1)}%`);
console.log(`判断：留空率与「无」占比必须一起看；「未获取」若被写成「无」，风险会被静默传给下一班。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
