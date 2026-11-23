#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 2 章 证候词表的价值在可归并，不在证名多
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/02-zhongyi-zhenghou-paisheng/docs/zh.md
 * 数据: 本章正文的锚点表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 900／132／14／208 从正文表里读，1.58、9.4、11 由除法现算；
 * 商业侧的 5.9 个月回本由案例库原始参数重算，不读现成结果列。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '02-zhongyi-zhenghou-paisheng';
const NO = 2;
const TITLE = '证候词表的价值在可归并，不在证名多';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const units = rows.get('单元');
const syndromes = rows.get('证');
const families = rows.get('族');
const coverage = rows.get('病证覆盖');
const otherShare = rows.get('「其他」族') / 100;
const src = doc.match(/外科\s*(\d+)\s*＋\s*儿科\s*(\d+)\s*＋\s*妇科\s*(\d+)/);
if (!src) throw new Error('正文缺少三个底本的单元数');
const srcSum = Number(src[1]) + Number(src[2]) + Number(src[3]);

if (srcSum !== units) throw new Error(`三底本相加 ${srcSum} ≠ 正文单元 ${units}`);
const perSyndrome = coverage / syndromes;
const perFamily = syndromes / families;
const otherCount = syndromes * otherShare;
if (Math.abs(perSyndrome - 1.58) > 0.01) throw new Error('每证覆盖复算与正文 1.58 不一致');
if (Math.abs(perFamily - 9.4) > 0.06) throw new Error('每族证数复算与正文 9.4 不一致');

banner(NO, TITLE);
console.log(`母体：外科 ${src[1]} ＋ 儿科 ${src[2]} ＋ 妇科 ${src[3]} = ${srcSum} 单元（正文表记 ${units}）`);
console.log(`派生：${syndromes} 证 / ${families} 族 / ${coverage} 次病证覆盖`);
console.log(`复算：${coverage} ÷ ${syndromes} = ${perSyndrome.toFixed(2)} 次/证（正文 1.58）`);
console.log(`复算：${syndromes} ÷ ${families} = ${perFamily.toFixed(1)} 证/族（正文 9.4）`);
console.log(`「其他」族 ${(otherShare * 100).toFixed(1)}% × ${syndromes} 证 = ${otherCount.toFixed(1)} 证（正文约 11 证），红线 10%`);
console.log(`判断：共用度低——多数证只在一门课出现一次；词表口径不等于教材全量。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
