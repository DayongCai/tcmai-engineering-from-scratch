#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 18 章 一个覆盖率会把「章节多」读成「底本齐」
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/18-guanli-fugaidu-baobiao/docs/zh.md
 * 数据: 本章正文的双维表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 405／2,115／208／134 从正文表读出；19.1% 覆盖率、两系占比 84.4% 现算。
 * 第二维「有底本层的学科数」在正文中待统计，脚本只打印结构关系，不编底本覆盖数。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '18-guanli-fugaidu-baobiao';
const NO = 18;
const TITLE = '一个覆盖率会把「章节多」读成「底本齐」';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const built = rows.get('已建章节');
const target = rows.get('目标章节');
const zhongyi = rows.get('中医系已建');
const jichu = rows.get('基础医学院已建');
const rate = (built / target) * 100;
const top2 = zhongyi + jichu;
const top2Share = (top2 / built) * 100;
if (Math.abs(rate - 19.1) > 0.05) throw new Error('单一覆盖率复算与正文 19.1% 不一致');
if (top2 !== 342) throw new Error('两系相加应为 342');

banner(NO, TITLE);
console.log(`一维：已建 ${built} ÷ 目标 ${target.toLocaleString('en-US')} = ${rate.toFixed(1)}%（正文 19.1%）`);
console.log(`结构：中医系 ${zhongyi} + 基础医学院 ${jichu} = ${top2} 章，占已建 ${built} 章的 ${top2Share.toFixed(1)}%`);
console.log(`第二维：有底本层的学科数（正文标「待统计」）；底本覆盖 = 有底本学科 ÷ 学科数，未统计前不报数。`);
console.log(`位次差 = 覆盖率位次 − 底本覆盖位次：正为章节多底本弱，负为底本强章节少。`);
console.log(`判断：覆盖率只做内部进度参考；目标章节数是排课期估算，不能当对外评估标准。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
