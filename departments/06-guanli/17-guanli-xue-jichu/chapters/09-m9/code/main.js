#!/usr/bin/env node
/**
 * 管理学基础 · 第 9 章 人力不是成本项，是唯一会自己决定出多少力的资源
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/09-m9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取入职、离职、年薪酬与重置成本口径，现算：
 *   一、净增与流失规模的对照；
 *   二、重置成本总额，以及折成「多少个护士的年薪酬」；
 *   三、离职率压下一半能省多少——把留人投入还原成成本置换，而不是福利。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const TITLE = '人力不是成本项，是唯一会自己决定出多少力的资源';

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

/** 正文第 5 行与第 54 行的全部设定。 */
function facts(text) {
  return {
    hires: grab(text, /入职\s*(\d+)\s*人/, '入职 120 人'),
    exits: grab(text, /离职\s*(\d+)\s*人/, '离职 67 人'),
    newHireLeavePct: grab(text, /新入职护士\s*\d+\s*个月内离职率\s*(\d+)%/, '31%'),
    growthReasonPct: grab(text, /看不到成长[^（]*（占\s*(\d+)%）/, '成长 38%'),
    scheduleReasonPct: grab(text, /排班无法安排生活[^（]*（占\s*(\d+)%）/, '排班 27%'),
    sessions: grab(text, /做了\s*(\d+)\s*场培训/, '14 场培训'),
    hoursPerPerson: grab(text, /人均\s*(\d+)\s*学时/, '12 学时'),
    satisfaction: grab(text, /培训满意度\s*(\d+)\s*分/, '94 分'),
    salaryWan: grab(text, /一名护士年薪酬\s*(\d+)\s*万元/, '12 万元'),
    resetWan: grab(text, /按\s*\d+\s*个月薪酬计约\s*(\d+)\s*万元/, '3 万元'),
    totalWan: grab(text, /直接重置成本约\s*(\d+)\s*万元/, '201 万元'),
    equivalents: grab(text, /相当于\s*([\d.]+)\s*个护士的年薪酬/, '16.75 个'),
  };
}

const netGrowth = (hires, exits) => hires - exits;

/** 单个重置成本（万元）= 年薪酬 ÷ 12 × 月数。 */
function resetCostWan(salaryWan, months) {
  if (!(salaryWan > 0) || !(months > 0)) throw new Error('薪酬与月数必须为正');
  return (salaryWan / 12) * months;
}

/** 年度重置成本总额（万元）。 */
function annualResetWan(exits, unitWan) {
  if (!(exits >= 0)) throw new Error('离职人数不能为负');
  return exits * unitWan;
}

/** 折成多少个在岗人员的年薪酬。 */
function equivalents(totalWan, salaryWan) {
  if (!(salaryWan > 0)) throw new Error('薪酬必须为正');
  return totalWan / salaryWan;
}

function main() {
  const text = read();
  const f = facts(text);
  const net = netGrowth(f.hires, f.exits);
  const unit = resetCostWan(f.salaryWan, 3);
  const total = annualResetWan(f.exits, unit);
  const eq = equivalents(total, f.salaryWan);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、队伍规模：入职 ${f.hires} 人、离职 ${f.exits} 人，净增 ${net} 人`);
  console.log(`  新入职护士 12 个月内离职率 ${f.newHireLeavePct}%，离职原因第一是「看不到成长」（${f.growthReasonPct}%），第二是排班（${f.scheduleReasonPct}%）`);
  console.log('  → 队伍在扩大，能力没在积累；净增是被培训与带教成本养出来的。');
  console.log('');
  console.log(`二、培训口径：${f.sessions} 场、人均 ${f.hoursPerPerson} 学时、满意度 ${f.satisfaction} 分`);
  console.log('  → 只测反应层，所以满意度高与「看不到成长」可以同时成立。');
  console.log('');
  console.log(`三、重置成本：年薪酬 ${f.salaryWan} 万元 ÷ 12 × 3 = 每个 ${unit.toFixed(0)} 万元；${f.exits} 人 × ${unit.toFixed(0)} = ${total.toFixed(0)} 万元`);
  console.log(`  折合 ${eq.toFixed(2)} 个护士的年薪酬（正文：${f.equivalents}）`);
  console.log(`  → 离职率压下一半可省约 ${(total / 2).toFixed(1)} 万元：留人投入不是福利，是成本置换。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；120 人、67 人、12 万元为演示换算关系的合成设定。');
  console.log('※ 本输出仅用于教学演示，不构成人事处理依据、薪酬设计方案或管理咨询意见。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  netGrowth,
  resetCostWan,
  annualResetWan,
  equivalents,
};
