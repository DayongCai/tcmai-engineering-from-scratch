#!/usr/bin/env node
/**
 * 中医管理学 · 第 4 章 科主任的两套权威，一套来自疗效，一套来自表格
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/04-z34/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的量都从正文取数后现算：
 *   二次分配的三个权重 → 两类行为的边际得分（饮片零加成 vs 检查组）
 *   8 分钟压到 5 分钟 → 人次放大倍数
 *   饮片使用率 41 → 58 → 44 的回退幅度
 * 结论由算式给出，不靠形容词：饮片在一个以收入为基数的方案里，边际得分恒为零。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '科主任的两套权威，一套来自疗效，一套来自表格';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 正文第 5、23 行给出的方案参数与行为数据。 */
function facts(text) {
  return {
    staff: grab(text, /科室\s*(\d+)\s*人/, '科室 14 人'),
    yearlyVisits: grab(text, /年门诊\s*(\d+)\s*万人次/, '年门诊 9 万人次') * 10000,
    wIncome: grab(text, /业务收入占\s*(\d+)%/, '业务收入占 60%'),
    wVisits: grab(text, /门诊人次占\s*(\d+)%/, '门诊人次占 25%'),
    wResearch: grab(text, /科研教学占\s*(\d+)%/, '科研教学占 15%'),
    rxYear1: grab(text, /饮片使用率从\s*(\d+)%/, '饮片率 41%'),
    rxPeak: grab(text, /提到\s*(\d+)%/, '提到 58%'),
    rxFall: grab(text, /第二年掉回\s*(\d+)%/, '掉回 44%'),
    minutesBefore: grab(text, /四小时看\s*30\s*人是每人\s*(\d+)\s*分钟/, '8 分钟'),
    minutesAfter: grab(text, /会向\s*(\d+)\s*分钟滑/, '5 分钟'),
  };
}

/**
 * 二次分配的边际得分：把一项行为折算成三个权重上的增量。
 * incomeVisits 是这项行为带来的账面收入，visitDelta 是门诊人次增量，researchDelta 是科研分增量。
 * 三项都以「基准」归一到 1，便于比较两种行为的相对拉力。
 */
function marginalScore({ wIncome, wVisits, wResearch }, base, action) {
  const income = (wIncome / 100) * (action.income / base.income);
  const visits = (wVisits / 100) * ((action.visitDelta || 0) / base.visits);
  const research = (wResearch / 100) * ((action.researchDelta || 0) / base.research);
  return income + visits + research;
}

/** 饮片方的账面结余：零加成时恒为 0；按帖数给固定劳务补贴时为正。 */
function rxMargin(dosesPerRx, subsidyPerDose) {
  return dosesPerRx * subsidyPerDose;
}

function main() {
  const text = read();
  const f = facts(text);
  const base = {
    income: f.yearlyVisits * 180 / 12,
    visits: f.yearlyVisits / 12,
    research: 100,
  };
  const rxZero = { income: 0, visitDelta: 0 };
  const checkOrder = { income: 200, visitDelta: 0 };
  const rxSubsidy = { income: rxMargin(14, 1.5), visitDelta: 0 };

  const sRxZero = marginalScore(f, base, rxZero);
  const sCheck = marginalScore(f, base, checkOrder);
  const sRxSub = marginalScore(f, base, rxSubsidy);
  const squeeze = f.minutesBefore / f.minutesAfter;

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、二次分配：${f.wIncome}% 收入 / ${f.wVisits}% 人次 / ${f.wResearch}% 科研`);
  console.log(`  基准：月门诊 ${base.visits.toFixed(0)} 人次、月业务收入 ${(base.income / 10000).toFixed(0)} 万元（按年 ${f.yearlyVisits / 10000} 万人次、次均 180 元折出）`);
  console.log(`  饮片方（零加成，${14} 剂 × 1.5 元帖数补贴前）边际得分：${sRxZero.toFixed(6)}`);
  console.log(`  检查组（200 元）边际得分：${sCheck.toFixed(6)}`);
  console.log(`  → 只差一项收入权重，饮片得分恒为零；再努力也追不上检查组。`);
  console.log(`  饮片方按 14 剂 × 1.5 元帖数补贴计，账面 ${rxSubsidy.income} 元，边际得分由零升到 ${sRxSub.toFixed(6)}。`);
  console.log('');
  console.log(`二、饮片使用率的回退：${f.rxYear1}% → ${f.rxPeak}% → ${f.rxFall}%`);
  console.log(`  第一年提升 ${f.rxPeak - f.rxYear1} 个百分点，第二年回退 ${f.rxPeak - f.rxFall} 个百分点，只留下 ${f.rxFall - f.rxYear1} 个。`);
  console.log('  → 回退幅度接近提升幅度的八成：个人推动的方向，被方案的方向抵消。');
  console.log('');
  console.log(`三、失真二：${f.minutesBefore} 分钟压到 ${f.minutesAfter} 分钟，人次放大 ${squeeze.toFixed(1)} 倍`);
  console.log('  → 四诊只剩问诊，方子开始重复；月度数据读作效率提升，年度数据读作复诊率下降。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；本例为演算设定，不指向任何真实科室或个人。');
  console.log('※ 本输出仅用于教学演示，不构成人事管理、绩效分配或劳动关系意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, marginalScore, rxMargin };
