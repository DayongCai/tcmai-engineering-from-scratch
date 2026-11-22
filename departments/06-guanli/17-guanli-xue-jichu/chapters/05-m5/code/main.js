#!/usr/bin/env node
/**
 * 管理学基础 · 第 5 章 计划不是把目标写下来，是把目标拆到有人签字
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/05-m5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取出院例数与平均住院日的前后值，现算：占用床日、释放床日、折算新增收治能力；
 * 再把「降 1.2 天」按正文给出的四段压缩量核对是否对得上账。
 * 分解对不上账，计划就只是一句口号；对得上账，才有四件能派人做的事。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '计划不是把目标写下来，是把目标拆到有人签字';

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

/** 正文第 5 行的年度计划与第 57–66 行的分解推演。 */
function facts(text) {
  return {
    tasks: grab(text, /年度工作计划[^，]*?(\d+)\s*项任务/, '87 项任务'),
    doneTasks: grab(text, /完成\s*(\d+)\s*项/, '完成 84 项'),
    discharges: grab(text, /全院出院\s*([\d,]+)\s*例/, '出院 24,000 例'),
    losBefore: grab(text, /平均住院日\s*([\d.]+)\s*天，占用床日/, '8.6 天'),
    losAfter: grab(text, /目标\s*([\d.]+)\s*天/, '7.4 天'),
    segPreOp: grab(text, /术前等待[^|]*\|\s*([\d.]+)\s*天/, '术前 0.50 天'),
    segPostOp: grab(text, /术后观察[^|]*\|\s*([\d.]+)\s*天/, '术后 0.30 天'),
    segQueue: grab(text, /检查预约排队\s*\|\s*([\d.]+)\s*天/, '预约 0.25 天'),
    segSettle: grab(text, /出院结算与带药\s*\|\s*([\d.]+)\s*天/, '结算 0.15 天'),
  };
}

/** 占用床日 = 出院例数 × 平均住院日。 */
function bedDays(discharges, los) {
  if (!(discharges > 0) || !(los > 0)) throw new Error('例数与住院日必须为正');
  return discharges * los;
}

/** 释放床日 = 两个时点占用床日之差。 */
function releasedBedDays(discharges, before, after) {
  if (after >= before) throw new Error('目标住院日应低于现状');
  return bedDays(discharges, before) - bedDays(discharges, after);
}

/** 按目标住院日折算的新增收治能力。 */
function addedCapacity(released, targetLos) {
  if (!(targetLos > 0)) throw new Error('目标住院日必须为正');
  return released / targetLos;
}

/** 收治能力的相对提升。 */
function capacityLift(added, discharges) {
  return (added / discharges) * 100;
}

/** 四段压缩量之和，必须等于总裁要求的降幅。 */
function segmentsSum(f) {
  return f.segPreOp + f.segPostOp + f.segQueue + f.segSettle;
}

function main() {
  const text = read();
  const f = facts(text);
  const before = bedDays(f.discharges, f.losBefore);
  const after = bedDays(f.discharges, f.losAfter);
  const released = releasedBedDays(f.discharges, f.losBefore, f.losAfter);
  const added = addedCapacity(released, f.losAfter);
  const lift = capacityLift(added, f.discharges);
  const sum = segmentsSum(f);
  const gap = f.losBefore - f.losAfter;

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、计划与目标的脱钩：${f.tasks} 项任务完成 ${f.doneTasks} 项（${((f.doneTasks / f.tasks) * 100).toFixed(1)}%）`);
  console.log('  → 完成率量的是「有没有做」，目标量的是「有没有变」；两者可以同时成立。');
  console.log('');
  console.log(`二、住院日 ${f.losBefore} → ${f.losAfter} 天，出院 ${f.discharges} 例/年`);
  console.log(`  占用床日 ${before.toFixed(0)} → ${after.toFixed(0)}，全年释放 ${released.toFixed(0)} 床日`);
  console.log(`  按目标住院日折算，新增收治能力 ${added.toFixed(0)} 例/年，约 ${lift.toFixed(1)}%`);
  console.log('  → 缩短住院日不是把病人赶走，是把同一批床位换出更多收治能力。');
  console.log('');
  console.log(`三、把 ${gap.toFixed(2)} 天拆成四段：`);
  console.log(`  术前等待 ${f.segPreOp.toFixed(2)} + 术后观察 ${f.segPostOp.toFixed(2)} + 检查预约 ${f.segQueue.toFixed(2)} + 出院结算 ${f.segSettle.toFixed(2)} = ${sum.toFixed(2)}`);
  console.log(`  与目标降幅之差 ${(sum - gap).toFixed(2)} 天 —— 对得上账，才派得出四件事。`);
  console.log('  → 没有这一步，目标就只是一个会，不是一个计划；也追不到谁签了字。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；87 项、24,000 例、8.6 与 7.4 天为演算设定，不对应真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成管理咨询意见或绩效考核方案。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  bedDays,
  releasedBedDays,
  addedCapacity,
  capacityLift,
  segmentsSum,
};
