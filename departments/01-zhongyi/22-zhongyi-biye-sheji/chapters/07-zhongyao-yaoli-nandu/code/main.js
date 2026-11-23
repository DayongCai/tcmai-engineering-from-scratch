#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 7 章 难度图谱是代理指标，不能替老师判难
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/07-zhongyao-yaoli-nandu/docs/zh.md
 * 数据: 本章正文的层级表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 49／196／588／7,455／971,179／421 从正文表读出；
 * 4.0 节/章、3.0 小节/节、12.7 段/小节、1,651.7 字/小节、0.72 个数值/小节全部现算。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '07-zhongyao-yaoli-nandu';
const NO = 7;
const TITLE = '难度图谱是代理指标，不能替老师判难';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const chapters = rows.get('章');
const sections = rows.get('节');
const subsections = rows.get('小节');
const paragraphs = rows.get('段');
const hanziTotal = rows.get('汉字');
const numbers = rows.get('数值');

const perChapter = sections / chapters;
const perSection = subsections / sections;
const perSubPara = paragraphs / subsections;
const perSubHanzi = hanziTotal / subsections;
const perSubNum = numbers / subsections;
if (Math.abs(perSubHanzi - 1651.7) > 0.2) throw new Error('每小节字数复算与正文 1,651.7 不一致');
if (Math.abs(perSubNum - 0.72) > 0.01) throw new Error('每小节数值复算与正文 0.72 不一致');

banner(NO, TITLE);
console.log(`层级：${chapters} 章 → ${sections} 节 → ${subsections} 小节 → ${paragraphs.toLocaleString('en-US')} 段`);
console.log(`复算：${sections} ÷ ${chapters} = ${perChapter.toFixed(1)} 节/章；${subsections} ÷ ${sections} = ${perSection.toFixed(1)} 小节/节`);
console.log(`复算：${paragraphs.toLocaleString('en-US')} ÷ ${subsections} = ${perSubPara.toFixed(1)} 段/小节`);
console.log(`复算：${hanziTotal.toLocaleString('en-US')} ÷ ${subsections} = ${perSubHanzi.toFixed(1)} 字/小节（正文 1,651.7）`);
console.log(`复算：${numbers} ÷ ${subsections} = ${perSubNum.toFixed(2)} 个数值/小节（正文 0.72）`);
console.log(`判断：数值为 0 的小节在乘法模型下乘积归零，会被误排到最容易一端；必须分组排序并让教师盲判。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
