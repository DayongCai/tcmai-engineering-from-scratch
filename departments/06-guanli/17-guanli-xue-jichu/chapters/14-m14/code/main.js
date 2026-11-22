#!/usr/bin/env node
/**
 * 管理学基础 · 第 14 章 创新不是想出新点子，是让新点子活着走出实验室
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/14-m14/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取申报数、立项数、一年后仍在常规开展的数，现算：
 *   一、立项率与留存率——两个数一起看才看得出「通过了但没人用」；
 *   二、留存数占立项数的比例，即从批文到常规的转化率；
 *   三、结论落到第四关：换一个人还能不能跑起来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 14;
const TITLE = '创新不是想出新点子，是让新点子活着走出实验室';

const D = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const U = { 十: 10, 百: 100, 千: 1000, 万: 10000 };

function cnInt(s) {
  if (!/^[零一二两三四五六七八九十百千万]+$/.test(s)) throw new Error('认不出的中文数字: ' + s);
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of s) {
    if (ch in D) { num = D[ch]; continue; }
    const unit = U[ch];
    if (unit === 10000) { section = (section + num) * unit; total += section; section = 0; num = 0; }
    else { if (num === 0) num = 1; section += num * unit; num = 0; }
  }
  return total + section + num;
}

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label, conv) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = conv === 'cn' ? cnInt(m[1]) : Number(m[1]);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 正文第 5 行的一组申报数据。 */
function facts(text) {
  return {
    applied: grab(text, /申报院内新技术新项目([零一二两三四五六七八九十百千万]+)项/, '八十七项', 'cn'),
    approved: grab(text, /通过立项([零一二两三四五六七八九十百千万]+)项/, '六十一项', 'cn'),
    routine: grab(text, /常规开展的([零一二两三四五六七八九十百千万]+)项/, '九项', 'cn'),
    papers: grab(text, /相关论文([零一二两三四五六七八九十百千万]+)篇/, '四十三篇', 'cn'),
    approvedPct: grab(text, /立项率\s*(\d+)%/, '70%'),
    routinePct: grab(text, /（([\d.]+)%）/, '10.3%'),
  };
}

/** 立项率 = 立项数 ÷ 申报数。 */
function approvalRate(approved, applied) {
  if (!(applied > 0)) throw new Error('申报数必须为正');
  if (approved > applied) throw new Error('立项数不能多于申报数');
  return (approved / applied) * 100;
}

/** 转化率 = 进入常规的数 ÷ 立项数。 */
function conversionRate(routine, approved) {
  if (!(approved > 0)) throw new Error('立项数必须为正');
  return (routine / approved) * 100;
}

function main() {
  const text = read();
  const f = facts(text);
  const approval = approvalRate(f.approved, f.applied);
  const routineRate = approvalRate(f.routine, f.applied);
  const conversion = conversionRate(f.routine, f.approved);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、申报 ${f.applied} 项，通过立项 ${f.approved} 项：立项率 ${approval.toFixed(1)}%（正文 ${f.approvedPct}%）`);
  console.log(`  一年后仍在常规开展 ${f.routine} 项：占申报 ${routineRate.toFixed(1)}%（正文 ${f.routinePct}%）`);
  console.log('  → 立项率七成、留存率一成：中间那批不是失败，是拿到了批文却没人用。');
  console.log('');
  console.log(`二、从批文到常规的转化率：${f.routine} ÷ ${f.approved} = ${conversion.toFixed(1)}%`);
  console.log(`  同期相关论文 ${f.papers} 篇 —— 论文数不能替代转化数，它衡量的是另一件事。`);
  console.log('  → 失效点不在创意端，在「没有人被指定负责让它变成常规」。');
  console.log('');
  console.log('三、五道关：识别（谁在为此付出代价）· 验证（有无中止条件）· 采纳（五项属性缺几项）');
  console.log('     · 制度化（换个人还能不能跑）· 规模化（变异能不能控住）');
  console.log('  → 第四关的判据最硬：靠个人坚持的项目，人一走就停。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；87、61、9 项为合成示例，不对应真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成技术评估意见、项目审批依据或管理咨询意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, cnInt, facts, approvalRate, conversionRate };
