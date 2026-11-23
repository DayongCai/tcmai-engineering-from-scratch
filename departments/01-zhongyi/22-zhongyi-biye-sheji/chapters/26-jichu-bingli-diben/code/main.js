#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 26 章 最大的底本层，先证明它可被别人复用
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/26-jichu-bingli-diben/docs/zh.md
 * 数据: 本章正文的规模表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 252 单元、428,867 字从正文表读出；428,867 ÷ 252 = 1,701.9 字/单元现算；
 * 复用失败位置与复用率由台账给出，正文未给数，不预填。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '26-jichu-bingli-diben';
const NO = 26;
const TITLE = '最大的底本层，先证明它可被别人复用';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const units = rows.get('单元');
const hanziTotal = rows.get('汉字');
const built = rows.get('原课已建');
const mean = hanziTotal / units;
const perChapter = units / built;
if (Math.abs(mean - 1701.9) > 0.05) throw new Error('每单元均值复算与正文 1,701.9 不一致');

banner(NO, TITLE);
console.log(`规模：${units} 单元 · ${hanziTotal.toLocaleString('en-US')} 汉字 · 原课已建 ${built} 章`);
console.log(`复算：${hanziTotal.toLocaleString('en-US')} ÷ ${units} = ${mean.toFixed(1)} 字/单元（正文 1,701.9）`);
console.log(`复算：${units} ÷ ${built} = ${perChapter.toFixed(1)} 单元/已建章（切分粒度的侧面）`);
console.log(`复用验收：目标课跑门禁、抽三章核对字数、未参与者按文档重建，三个动作缺一不可。`);
console.log(`判据：失败率 = 失败位置数 ÷ 已迁章节数；复用率 = 全复用课数 ÷ 目标课数；失败位置须逐条可定位。`);
console.log(`判断：252 单元是全库最大，规模不等于质量；只报成功不报失败，等于只交了一半。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
