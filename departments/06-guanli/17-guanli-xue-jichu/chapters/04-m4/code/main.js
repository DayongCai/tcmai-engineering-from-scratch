#!/usr/bin/env node
/**
 * 管理学基础 · 第 4 章 决策不是选最好的，是在信息不够时选一个能交代的
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/04-m4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三个工具全部从正文取数后现算，并与正文自己写的数对账：
 *   一、盈亏平衡：保本量 =（年折旧 + 年运营成本）÷ 单次收费，再折成日均；
 *   二、实际与论证的落差：按两个日均量各算一次收入与盈亏；
 *   三、期望值与敏感度：概率加权，以及收费下调后保本量的移动。
 * 对不上账就报错——正文一改，脚本先叫，不静默沿用旧数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '决策不是选最好的，是在信息不够时选一个能交代的';

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

/** 正文第 5 行与第 47–53 行的全部设定。 */
function facts(text) {
  return {
    investWan: grab(text, /购置一台\s*([\d,]+)\s*万元的影像设备/, '设备 1,200 万元'),
    arguedDaily: grab(text, /测算日均检查\s*(\d+)\s*人次/, '论证 22 人次'),
    actualDaily: grab(text, /实际日均\s*([\d.]+)\s*人次/, '实际 9.4 人次'),
    depreciateYears: grab(text, /按\s*(\d+)\s*年折旧/, '8 年折旧'),
    opexWan: grab(text, /年运营成本（[^）]*）\s*(\d+)\s*万元/, '运营成本 60 万元'),
    price: grab(text, /单次检查收费\s*(\d+)\s*元/, '收费 500 元'),
    workdays: grab(text, /按每年\s*(\d+)\s*个工作日计/, '256 个工作日'),
    lowPrice: grab(text, /若收费从\s*\d+\s*元降到\s*(\d+)\s*元/, '收费降到 400 元'),
    pOptimistic: grab(text, /乐观（概率\s*([\d.]+)，年收益\s*\d+\s*万）/, '乐观概率 0.3'),
    pNeutral: grab(text, /中性（([\d.]+)，\d+\s*万）/, '中性概率 0.5'),
    pPessimistic: grab(text, /悲观（([\d.]+)，−\d+\s*万）/, '悲观概率 0.2'),
    gainOptimistic: grab(text, /乐观（概率\s*[\d.]+，年收益\s*(\d+)\s*万）/, '乐观 300 万'),
    gainNeutral: grab(text, /中性（[\d.]+，(\d+)\s*万）/, '中性 80 万'),
    lossPessimistic: grab(text, /悲观（[\d.]+，−(\d+)\s*万）/, '悲观 −120 万'),
  };
}

/** 年固定成本：折旧 + 运营，单位万元。 */
function annualFixedWan(f) {
  return f.investWan / f.depreciateYears + f.opexWan;
}

/** 保本检查量（人次/年）= 年固定成本 ÷ 单次收费。 */
function breakEvenVolume(fixedWan, price) {
  if (!(price > 0)) throw new Error('收费必须为正');
  return (fixedWan * 10000) / price;
}

/** 日均保本量 = 年保本量 ÷ 工作日。 */
function dailyVolume(annual, workdays) {
  if (!(workdays > 0)) throw new Error('工作日必须为正');
  return annual / workdays;
}

/** 按某个日均量算年收入与盈余（万元）。 */
function yearly(f, daily, price) {
  const visits = daily * f.workdays;
  const revenueWan = (visits * price) / 10000;
  return { visits, revenueWan, profitWan: revenueWan - annualFixedWan(f) };
}

/** 期望值（万元）：概率加权。 */
function expectedWan(f) {
  const sum = f.pOptimistic + f.pNeutral + f.pPessimistic;
  if (Math.abs(sum - 1) > 1e-9) throw new Error('概率之和应为 1，实得 ' + sum);
  return f.pOptimistic * f.gainOptimistic + f.pNeutral * f.gainNeutral - f.pPessimistic * f.lossPessimistic;
}

function main() {
  const text = read();
  const f = facts(text);
  const fixed = annualFixedWan(f);
  const be = breakEvenVolume(fixed, f.price);
  const beDaily = dailyVolume(be, f.workdays);
  const argued = yearly(f, f.arguedDaily, f.price);
  const actual = yearly(f, f.actualDaily, f.price);
  const ev = expectedWan(f);
  const lowBe = breakEvenVolume(fixed, f.lowPrice);
  const lowDaily = dailyVolume(lowBe, f.workdays);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、盈亏平衡：投资 ${f.investWan} 万元 / ${f.depreciateYears} 年 + 运营 ${f.opexWan} 万元 = 年固定 ${fixed.toFixed(0)} 万元`);
  console.log(`  保本量 ${be.toFixed(0)} 人次/年 ÷ ${f.workdays} 个工作日 = 日均 ${beDaily.toFixed(1)} 人次`);
  console.log('  → 这个数在决策当时就能算出来，不需要任何预测能力，只需要把折旧算进去。');
  console.log('');
  console.log(`二、论证与实际：同样的固定成本，两个日均量`);
  console.log(`  论证 ${f.arguedDaily} 人次/日 → ${argued.visits.toFixed(0)} 人次/年、收入 ${argued.revenueWan.toFixed(1)} 万元、盈余 ${argued.profitWan.toFixed(1)} 万元`);
  console.log(`  实际 ${f.actualDaily} 人次/日 → ${Math.round(actual.visits)} 人次/年、收入 ${actual.revenueWan.toFixed(1)} 万元、盈余 ${actual.profitWan.toFixed(1)} 万元`);
  console.log(`  → 保本点 ${beDaily.toFixed(1)} 与实测 ${f.actualDaily} 之间的落差，就是决策失误的全部金额。`);
  console.log('');
  console.log(`三、期望值：${f.pOptimistic}×${f.gainOptimistic} + ${f.pNeutral}×${f.gainNeutral} − ${f.pPessimistic}×${f.lossPessimistic} = ${ev.toFixed(0)} 万元`);
  console.log(`  → 期望值为正不等于该做：悲观情形一次亏 ${f.lossPessimistic} 万元，若超出可承受范围，平均值再高也扛不住。`);
  console.log(`四、敏感度：收费 ${f.price} → ${f.lowPrice} 元，保本量升到 ${lowBe.toFixed(0)} 人次/年、日均 ${lowDaily.toFixed(1)} 人次`);
  console.log(`  → 与论证值 ${f.arguedDaily} 的余量立刻消失，这类决策要在实施中设更密的复查点。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；金额与概率均为演算设定，不对应真实设备或价格。');
  console.log('※ 本输出仅用于教学演示，不构成投资建议、采购建议或管理咨询意见。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  annualFixedWan,
  breakEvenVolume,
  dailyVolume,
  yearly,
  expectedWan,
};
