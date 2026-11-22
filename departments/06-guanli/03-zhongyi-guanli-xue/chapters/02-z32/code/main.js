#!/usr/bin/env node
/**
 * 中医管理学 · 第 2 章 规划一家中医机构，真正要决定的是关掉哪些科室
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/02-z32/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的两条链都从正文取数后现算：
 *   门诊量 → 中药处方 → 剂数 → 调剂人力 → 代煎锅次 → 煎药机时
 *   年固定成本 → 每诊次结余 → 保本诊次 → 每工作日人次
 * 另算一项结构指标：头部五科与尾部十二科的单科门诊量差距。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '规划一家中医机构，真正要决定的是关掉哪些科室';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 中文数字转阿拉伯数字，覆盖本章出现的一至十二。 */
function cn(s) {
  const d = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (s === '十二') return 12;
  if (s.length === 2 && s[0] === '十') return 10 + d[s[1]];
  if (!(s in d)) throw new Error('不认识的中文数字: ' + s);
  return d[s];
}

function grab(text, re, label, conv) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const raw = String(m[1]).replace(/,/g, '');
  const n = conv === 'cn' ? cn(raw) : Number(raw);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + raw);
  return n;
}

/** 正文第 45、47、51 行的演算设定。 */
function facts(text) {
  return {
    dailyVisits: grab(text, /日均门诊\s*([\d,]+)\s*人次/, '日均门诊 1,000 人次'),
    rxShare: grab(text, /中药处方占比\s*(\d+)%/, '中药处方占比 55%'),
    dosesPerRx: grab(text, /平均每方\s*(\d+)\s*剂/, '平均每方 14 剂'),
    dosesPerHour: grab(text, /每小时约\s*(\d+)\s*剂/, '每小时约 40 剂'),
    shiftHours: grab(text, /([一二三四五六七八九十]+)小时工作制/, '八小时工作制', 'cn'),
    decoctShare: grab(text, /代煎比例按\s*(\d+)%/, '代煎比例 30%'),
    dosesPerPot: grab(text, /每锅\s*(\d+)\s*剂/, '每锅 10 剂'),
    minutesPerPot: grab(text, /每锅\s*(\d+)\s*分钟/, '每锅 40 分钟'),
    fixedCost: grab(text, /年固定成本约\s*(\d+)\s*万元/, '年固定成本 90 万元') * 10000,
    pricePerVisit: grab(text, /每诊次收费与饮片结余合计约\s*(\d+)\s*元/, '每诊次 60 元'),
    variablePerVisit: grab(text, /变动成本约\s*(\d+)\s*元/, '变动成本 15 元'),
    topShare: grab(text, /前五位占全院\s*(\d+)%/, '前五占 68%'),
    tailShare: grab(text, /后十二位的科室合计不到\s*(\d+)%/, '后十二位不到 6%'),
    workdays: 300,
  };
}

/**
 * 调剂与代煎的产能链。
 * 返回每一环的中间量，便于逐段核对——链上任一环低估，断在患者等待的那一小时。
 */
function supplyChain({ dailyVisits, rxShare, dosesPerRx, dosesPerHour, shiftHours, decoctShare, dosesPerPot, minutesPerPot }) {
  const rx = dailyVisits * (rxShare / 100);
  const doses = rx * dosesPerRx;
  const perDispenser = dosesPerHour * shiftHours;
  const dispensers = Math.round(doses / perDispenser);
  const decoctDoses = doses * (decoctShare / 100);
  const pots = Math.ceil(decoctDoses / dosesPerPot);
  const machineMinutes = pots * minutesPerPot;
  return {
    rx,
    doses,
    perDispenser,
    dispensers,
    decoctDoses,
    pots,
    machineMinutes,
    machineHours: machineMinutes / 60,
  };
}

/** 保本诊次：固定成本 ÷（每诊次收入 − 变动成本）。 */
function breakeven(fixedCost, pricePerVisit, variablePerVisit, workdays = 300) {
  const margin = pricePerVisit - variablePerVisit;
  if (!(margin > 0)) throw new Error('每诊次结余不为正，保本诊次无解');
  const visits = fixedCost / margin;
  return { margin, visits, perWorkday: Math.floor(visits / workdays) };
}

/** 头部与尾部科室的单科平均门诊量差几倍。 */
function concentration(topShare, topN, tailShare, tailN) {
  const topAvg = topShare / topN;
  const tailAvg = tailShare / tailN;
  return { topAvg, tailAvg, ratio: topAvg / tailAvg };
}

function main() {
  const text = read();
  const f = facts(text);
  const chain = supplyChain(f);
  const be = breakeven(f.fixedCost, f.pricePerVisit, f.variablePerVisit, f.workdays);
  const c = concentration(f.topShare, 5, f.tailShare, 12);

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log('一、门诊量 → 调剂产能（一条必须算完的链）');
  console.log(`  日均门诊 ${f.dailyVisits} 人次 × 中药处方 ${f.rxShare}% = ${chain.rx} 张方`);
  console.log(`  × 每方 ${f.dosesPerRx} 剂 = ${chain.doses} 剂／日`);
  console.log(`  ÷ 每人每日 ${chain.perDispenser} 剂 = ${chain.dispensers} 名调剂员（含复核）`);
  console.log(`  代煎 ${f.decoctShare}% = ${chain.decoctDoses} 剂，每锅 ${f.dosesPerPot} 剂 → ${chain.pots} 锅`);
  console.log(`  每锅 ${f.minutesPerPot} 分钟 → ${chain.machineMinutes} 机分钟 = ${chain.machineHours} 机时／日`);
  console.log('  → 台数取决于每日可开机时数；机时不够，候药就长，第二年患者去了别处。');
  console.log('');
  console.log('二、一间内科诊室的保本门诊量');
  console.log(`  固定成本 ${f.fixedCost.toLocaleString('en-US')} 元 ÷ 每诊次结余 ${be.margin} 元 = ${be.visits} 诊次／年`);
  console.log(`  按每年 ${f.workdays} 个工作日折算：每工作日 ${be.perWorkday} 人次`);
  console.log('  → 这个数字与「该不该设这个科室」是同一个问题的两种问法。');
  console.log('');
  console.log('三、科室结构：头部与尾部的单科差距');
  console.log(`  前五科合计 ${f.topShare}%，单科平均 ${c.topAvg.toFixed(1)}%`);
  console.log(`  后十二科合计 ${f.tailShare}%，单科平均 ${c.tailAvg.toFixed(2)}%`);
  console.log(`  → 单科门诊量相差约 ${c.ratio.toFixed(0)} 倍，但每科仍配主任、护士长、两间诊室与一套设备。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；换算系数为演算设定，不是定额标准。');
  console.log('※ 本输出仅用于教学演示，不构成机构设置审批、医保定点或投资决策意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, supplyChain, breakeven, concentration };
