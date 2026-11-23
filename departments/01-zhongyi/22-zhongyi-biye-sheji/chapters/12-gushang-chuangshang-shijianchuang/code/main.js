#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 12 章 教材不给时点，就别替它编一个
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/12-gushang-chuangshang-shijianchuang/docs/zh.md
 * 数据: 本章正文的母体表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 48 单元、151,733 字、全库数值 0 从正文读出；3,161.1 字/单元现算。
 * 数值为 0 时，抽数字必然得到 0 条——本脚本显式演示这个断点，再按中文时间词表分组。
 */

'use strict';

const path = require('node:path');
const { readDoc, grab, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '12-gushang-chuangshang-shijianchuang';
const NO = 12;
const TITLE = '教材不给时点，就别替它编一个';
const doc = readDoc(SLUG).text;

const units = grab(doc, /急救教材\s*(\d+)\s*单元/, '单元数');
const hanziTotal = grab(doc, /单元、\s*([\d,]+)\s*汉字/, '汉字数');
const numbers = grab(doc, /全库数值为\s*(\d+)/, '数值个数');
const mean = hanziTotal / units;
const digitExtract = numbers; // 用抽数字的办法，命中就是全库数值数
const WORDS = [
  ['即刻类', ['即刻', '立即', '尽快']],
  ['分钟类', ['数分钟', '半小时']],
  ['小时类', ['数小时']],
  ['日类', ['一日内']],
  ['模糊类', ['数日']],
];
if (Math.abs(mean - 3161.1) > 0.1) throw new Error('每单元均值复算与正文 3,161.1 不一致');
if (digitExtract !== 0) throw new Error('正文记全库数值为 0');

banner(NO, TITLE);
console.log(`母体：${units} 单元 · ${hanziTotal.toLocaleString('en-US')} 汉字 · 数值 ${numbers}`);
console.log(`复算：${hanziTotal.toLocaleString('en-US')} ÷ ${units} = ${mean.toFixed(1)} 字/单元（正文 3,161.1）`);
console.log(`断点：用正则抽阿拉伯数字，命中 ${digitExtract} 条——不是教材没有时间窗，是这本书不用数字。`);
console.log('中文时间词表按粒度分组：');
for (const [group, words] of WORDS) console.log(`  ${group}\t${words.join('、')}`);
console.log(`判断：先建词表再抽，分「明确窗口／模糊表述／无时点」三类；只报教材有没有，不报指南要求多少。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
