#!/usr/bin/env node
/**
 * 管理学基础 · 第 2 章 每一种"最优解"都是它那个年代的应急方案
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/02-m2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两个数从正文取数后现算：
 *   一、三次转向的年份间距（用正文的纪年，不手写年份）；
 *   二、按人次计酬后「人次增长」与「总诊疗时间」的差额——量涨了多少，时间少给了多少。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '每一种"最优解"都是它那个年代的应急方案';

const DIGIT = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 正文用汉字纪年（一九一一年），这里转成数字，四位以内。 */
function cnYear(s) {
  if (!/^[〇一二三四五六七八九]{4}$/.test(s)) throw new Error('认不出的汉字纪年: ' + s);
  return [...s].reduce((n, ch) => n * 10 + DIGIT[ch], 0);
}

function grabYear(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  return cnYear(m[1]);
}

function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = Number(m[1]);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 三次转向与权变转向的纪年，全部取自正文。 */
function facts(text) {
  return {
    taylor: grabYear(text, /泰勒在([〇一二三四五六七八九]{4})年出版/, '泰勒一九一一年'),
    fayol: grabYear(text, /法约尔在([〇一二三四五六七八九]{4})年出版/, '法约尔一九一六年'),
    mayoFrom: grabYear(text, /梅奥等人在([〇一二三四五六七八九]{4})年至/, '霍桑一九二四年'),
    mayoTo: grabYear(text, /梅奥等人在[〇一二三四五六七八九]{4}年至([〇一二三四五六七八九]{4})年/, '霍桑一九三二年'),
    contingency: grabYear(text, /伯恩斯与斯托克在([〇一二三四五六七八九]{4})年比较/, '权变一九六一年'),
    visitGrowthPct: grab(text, /门诊量上升\s*(\d+)%/, '门诊量上升 18%'),
    minutesBefore: grab(text, /从\s*(\d+)\s*分钟降到\s*7\s*分钟/, '单次 11 分钟'),
    minutesAfter: grab(text, /从\s*\d+\s*分钟降到\s*(\d+)\s*分钟/, '单次 7 分钟'),
  };
}

/** 一次转向的间隔。 */
const gap = (a, b) => b - a;

/** 单位时间人次上升后，总诊疗时间的变化：量 × 单次时长。 */
function totalVisitMinutes(visits, pct, minutes) {
  return visits * (1 + pct / 100) * minutes;
}

function totalMinutesChangePct(before, after, pct) {
  return (totalVisitMinutes(before, pct, after) / totalVisitMinutes(before, 0, before) - 1) * 100;
}

function main() {
  const text = read();
  const f = facts(text);
  const change = totalMinutesChangePct(f.minutesBefore, f.minutesAfter, f.visitGrowthPct);
  const perVisit = (f.minutesAfter / f.minutesBefore - 1) * 100;

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log('一、三次转向的纪年与间隔');
  console.log(`  效率（泰勒 ${f.taylor}）：把动作拆开、计时、固化标准`);
  console.log(`  秩序（法约尔 ${f.fayol}）：层级、分工、规则、书面档案、非人格化职权`);
  console.log(`  人（霍桑 ${f.mayoFrom}–${f.mayoTo}，跨 ${gap(f.mayoFrom, f.mayoTo)} 年）：社会心理需要与团队规范`);
  console.log(`  效率 → 秩序间隔 ${gap(f.taylor, f.fayol)} 年；秩序 → 霍桑起点间隔 ${gap(f.fayol, f.mayoFrom)} 年`);
  console.log(`  到权变转向（${f.contingency}）共 ${gap(f.taylor, f.contingency)} 年，第三次转向尚未收束`);
  console.log('  → 三次转向不是替代关系，是叠加：每套解法都带着它要反驳的那个对象。');
  console.log('');
  console.log('二、按人次计酬的算术：量涨了，时间少给了');
  console.log(`  门诊量 ${f.visitGrowthPct}%，单次诊疗 ${f.minutesBefore} → ${f.minutesAfter} 分钟（${perVisit.toFixed(1)}%）`);
  console.log(`  总诊疗时间 = 人次 × 单次时长，变化 ${change.toFixed(1)}%`);
  console.log('  → 人次上去了，总服务时间反而减少；省掉的正是「问」与「切」所占的那几分钟。');
  console.log('    没有任何一条规定被违反——这是对激励的合理反应，不是职业道德问题。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；案例数字为演示激励机制的构造，不对应真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成管理咨询意见或制度设计依据。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  cnYear,
  facts,
  gap,
  totalVisitMinutes,
  totalMinutesChangePct,
};
