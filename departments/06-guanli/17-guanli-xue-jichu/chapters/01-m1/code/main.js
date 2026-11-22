#!/usr/bin/env node
/**
 * 管理学基础 · 第 1 章 管理不是把事做完，是让同样的力气换出不同的结果
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/01-m1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 所有数字从本章正文取数后现算：门诊量、人均日接诊、候诊时间、满意度、投诉件数。
 * 正文任何一处被改动，facts() 会先报错，而不是沿用旧值静默算完。
 * 算的是同一组数在「效果账」与「效率账」上分别得出什么结论。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '管理不是把事做完，是让同样的力气换出不同的结果';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 从正文抓一个数；抓不到就报错，不猜默认值。 */
function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 正文给出的那组对比（第 5 行）。 */
function facts(text) {
  return {
    visitsWan: grab(text, /去年门诊\s*([\d.]+)\s*万人次/, '门诊 48.6 万人次'),
    visitGrowthPct: grab(text, /比三年前增长\s*(\d+)%/, '增长 31%'),
    perDayLow: grab(text, /人均日接诊从\s*(\d+)\s*人次升到/, '人均日接诊 52'),
    perDayHigh: grab(text, /人均日接诊从\s*\d+\s*人次升到\s*(\d+)\s*人次/, '人均日接诊 68'),
    waitLow: grab(text, /候诊时间从\s*(\d+)\s*分钟拉长到/, '候诊 28 分钟'),
    waitHigh: grab(text, /候诊时间从\s*\d+\s*分钟拉长到\s*(\d+)\s*分钟/, '候诊 46 分钟'),
    satHigh: grab(text, /满意度从\s*([\d.]+)\s*分掉到/, '满意度 91.2'),
    satLow: grab(text, /满意度从\s*[\d.]+\s*分掉到\s*([\d.]+)\s*分/, '满意度 86.4'),
    complaintGrowthPct: grab(text, /投诉件数增长\s*(\d+)%/, '投诉增长 42%'),
  };
}

const liftPct = (from, to) => {
  if (!(from > 0)) throw new Error('基期必须为正');
  return (to / from - 1) * 100;
};

/** 效果账：服务量的增长。 */
function effectLift(f) {
  return liftPct(f.perDayLow, f.perDayHigh);
}

/** 效率账之患者一侧：等待时间的增长。 */
function waitLift(f) {
  return liftPct(f.waitLow, f.waitHigh);
}

/** 等待增长的增速是产出增速的几倍——同一组数在哪本账上更贵。 */
function waitOverOutput(f) {
  return waitLift(f) / effectLift(f);
}

/** 把单次候诊增量摊到全年门诊量上，得到一年新增的等待人时。 */
function annualAddedWaitHours(f) {
  const visits = f.visitsWan * 10000;
  const minutes = visits * (f.waitHigh - f.waitLow);
  return minutes / 60;
}

/** 满意度与投诉：报告里的两条反向曲线。 */
function serviceDelta(f) {
  return { satDelta: f.satLow - f.satHigh, complaintLiftPct: f.complaintGrowthPct };
}

function main() {
  const text = read();
  const f = facts(text);
  const effect = effectLift(f);
  const wait = waitLift(f);
  const ratio = waitOverOutput(f);
  const hours = annualAddedWaitHours(f);
  const d = serviceDelta(f);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、效果账：服务人次 ${f.visitsWan} 万，三年增长 ${f.visitGrowthPct}%`);
  console.log(`  医师人均日接诊 ${f.perDayLow} → ${f.perDayHigh} 人次，单位产出增长 ${effect.toFixed(1)}%`);
  console.log('  → 从「该做的事做成了没有」这一侧看，这是提升。');
  console.log('');
  console.log(`二、效率账：平均候诊 ${f.waitLow} → ${f.waitHigh} 分钟，等待成本增长 ${wait.toFixed(1)}%`);
  console.log(`  等待增速 ÷ 产出增速 = ${ratio.toFixed(2)} 倍`);
  console.log(`  摊到全年 ${f.visitsWan} 万人次：一年新增等待约 ${Math.round(hours).toLocaleString('en-US')} 人时`);
  console.log('  → 付出的是患者的时间，账不在机构报表上，但在患者的比较里。');
  console.log('');
  console.log(`三、两条反向曲线：满意度 ${f.satHigh} → ${f.satLow} 分（${d.satDelta.toFixed(1)}），投诉增长 ${d.complaintLiftPct}%`);
  console.log('  → 量与等待同时上升时，满意度与投诉会替患者把结论写出来。');
  console.log('');
  console.log(`结论：同一组数字，效果侧 +${f.visitGrowthPct}%，效率侧患者成本 +${wait.toFixed(0)}%，两个结论都真。`);
  console.log('      管理要做的第一件事不是选一个结论，是把这三本账分开记，再决定这一次让哪一边。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；本章数据为对照而设的合成示例，不对应任何真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成管理咨询意见或绩效分配依据。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  liftPct,
  effectLift,
  waitLift,
  waitOverOutput,
  annualAddedWaitHours,
  serviceDelta,
};
