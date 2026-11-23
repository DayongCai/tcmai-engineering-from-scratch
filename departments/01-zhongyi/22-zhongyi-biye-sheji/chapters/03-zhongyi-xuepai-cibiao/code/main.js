#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 3 章 一词命中一千四百次，证的是字频不是学派
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/03-zhongyi-xuepai-cibiao/docs/zh.md
 * 数据: 本章正文的三底本表与八派命中数 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 1,760＋402＋630＝2,792、1,476÷2,792＝52.9%、7÷2,792＝0.25%、1,476÷7≈211
 * 全部由正文读出的原始数现算；回本 70.4 个月由案例库参数重算。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '03-zhongyi-xuepai-cibiao';
const NO = 3;
const TITLE = '一词命中一千四百次，证的是字频不是学派';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const shanghan = rows.get('伤寒');
const jingui = rows.get('金匮');
const wenbing = rows.get('温病');
const total = rows.get('合计');
const top = grab(doc, /八派的命中从\s*[\d,]+\s*到\s*([\d,]+)/, '最高命中派');
const low = grab(doc, /八派的命中从\s*([\d,]+)\s*到\s*[\d,]+/, '最低命中派');

if (shanghan + jingui + wenbing !== total) throw new Error('三底本相加与合计不一致');
if (top + low === 0) throw new Error('命中数读取失败');
const topShare = (top / total) * 100;
const lowShare = (low / total) * 100;
const ratio = top / low;
if (Math.abs(topShare - 52.9) > 0.05) throw new Error(`最高派占比复算 ${topShare.toFixed(1)}% ≠ 正文 52.9%`);

banner(NO, TITLE);
console.log(`母体：伤寒 ${shanghan.toLocaleString('en-US')} ＋ 金匮 ${jingui} ＋ 温病 ${wenbing} = ${total.toLocaleString('en-US')} 条`);
console.log(`八派命中区间 ${low}–${top.toLocaleString('en-US')}，相差 ${ratio.toFixed(1)} 倍（正文约 211 倍）`);
console.log(`复算：${top.toLocaleString('en-US')} ÷ ${total.toLocaleString('en-US')} = ${topShare.toFixed(1)}%（正文 52.9%）`);
console.log(`复算：${low} ÷ ${total.toLocaleString('en-US')} = ${lowShare.toFixed(2)}%（正文 0.25%）`);
console.log(`判断：单字「汗」「下」「吐」在任何临床书里都高频，命中高不等于该派主张强；结论只写到词频。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
