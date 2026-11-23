#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 17 章 对不上的数不是笔误，是没有人负责计数
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/17-guanli-tongji-diben/docs/zh.md
 * 数据: 本章正文的四项现算口径 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 9 院系／187 学科／2,093 章节目标／11,457 学时从正文表读出；
 * 每学科章节数、每章节学时现算；差异条数目标为 0，示例 185 与 187 的差写成 +2。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '17-guanli-tongji-diben';
const NO = 17;
const TITLE = '对不上的数不是笔误，是没有人负责计数';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const depts = rows.get('院系');
const subjects = rows.get('学科');
const chapters = rows.get('章节目标');
const hours = rows.get('学时');
const perSubject = chapters / subjects;
const perChapter = hours / chapters;
const exampleDiff = 187 - 185; // 正文差异台账示例：文件 185，现算 187
if (exampleDiff !== 2) throw new Error('差异示例复算不一致');

banner(NO, TITLE);
console.log(`现算口径：${depts} 院系 · ${subjects} 学科 · ${chapters.toLocaleString('en-US')} 章节目标 · ${hours.toLocaleString('en-US')} 学时`);
console.log(`复算：${chapters.toLocaleString('en-US')} ÷ ${subjects} = ${perSubject.toFixed(2)} 章/学科`);
console.log(`复算：${hours.toLocaleString('en-US')} ÷ ${chapters.toLocaleString('en-US')} = ${perChapter.toFixed(2)} 学时/章`);
console.log(`差异示例：README 写 185、现算 187 → 差 ${exampleDiff > 0 ? '+' : ''}${exampleDiff}（文件落后）`);
console.log(`目标：四处比对差异条数为 0；破立验证＝故意改坏一个数，脚本必须报警，修复后转绿。`);
console.log(`判断：脚本只暴露不一致，不判定哪一处对；修复要落到岗位，快照与现算必须分清。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
