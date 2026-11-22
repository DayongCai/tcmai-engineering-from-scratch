#!/usr/bin/env node
/**
 * 中医管理学 · 第 1 章 中医机构的效率，不能按手术台的产出来算
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/01-z31/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三个效率口径都从正文取数后现算：半日门诊时长、单次分钟数、拆方剂数、药房减员比例。
 * 正文里任何一处数字被改动，facts() 会先抛错，而不是沿用旧值静默算完。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '中医机构的效率，不能按手术台的产出来算';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 中文数字转阿拉伯数字，只覆盖本章出现的一至十二。 */
function cn(s) {
  const d = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (s === '十二') return 12;
  if (s.length === 2 && s[0] === '十') return 10 + d[s[1]];
  if (s.length === 2 && s[1] === '十') return d[s[0]] * 10;
  if (!(s in d)) throw new Error('不认识的中文数字: ' + s);
  return d[s];
}

/** 从正文抓一个数；抓不到就报错，不猜默认值。 */
function grab(text, re, label, conv) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const raw = String(m[1]).replace(/,/g, '');
  const n = conv === 'cn' ? cn(raw) : Number(raw);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + raw);
  return n;
}

/**
 * 正文给出的演算设定（第 29、31、33 行）。
 * 这些都从文本里取，不在这里写死。
 */
function facts(text) {
  return {
    halfDayHours: grab(text, /一个半日门诊按([一二三四五六七八九十]+)小时计/, '半日门诊四小时', 'cn'),
    shortVisitPatients: grab(text, /看\s*(\d+)\s*人是每人\s*8\s*分钟/, '看 30 人每人 8 分钟'),
    longVisitPatients: grab(text, /看\s*(\d+)\s*人是每人\s*4\s*分钟/, '看 60 人每人 4 分钟'),
    packDays: grab(text, /把\s*(\d+)\s*剂拆成两个/, '14 剂拆成两个 7 剂'),
    splitDays: grab(text, /拆成两个\s*(\d+)\s*剂/, '拆成两个 7 剂'),
    cutShare: grab(text, /药房人力减掉([一二三四五六七八九十]+)分之一/, '药房减员三分之一', 'cn'),
  };
}

/** 诊次效率：单次可用分钟数 = 工时 × 60 ÷ 人次。 */
function minutesPerPatient(hours, patients) {
  if (!(hours > 0) || !(patients > 0)) throw new Error('工时与人次必须为正');
  return (hours * 60) / patients;
}

/** 复诊次数：一次开 N 剂与拆成 k 剂一调，在一个疗程里各要见几次面。 */
function followUpVisits(days, splitDays) {
  if (!(days > 0) || !(splitDays > 0)) throw new Error('剂数必须为正');
  return Math.ceil(days / splitDays);
}

/** 复诊率虚增比例：拆方后次数 ÷ 不拆时次数 − 1。 */
function inflation(days, splitDays) {
  return followUpVisits(days, splitDays) / followUpVisits(days, days) - 1;
}

function main() {
  const text = read();
  const f = facts(text);
  const short = minutesPerPatient(f.halfDayHours, f.shortVisitPatients);
  const long = minutesPerPatient(f.halfDayHours, f.longVisitPatients);
  const visits = followUpVisits(f.packDays, f.splitDays);
  const infl = inflation(f.packDays, f.splitDays);

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、诊次效率：半日 ${f.halfDayHours} 小时`);
  console.log(`  看 ${f.shortVisitPatients} 人 → 每人 ${short.toFixed(1)} 分钟（正文：8 分钟已是下限）`);
  console.log(`  看 ${f.longVisitPatients} 人 → 每人 ${long.toFixed(1)} 分钟；诊次翻倍，单次时长减半`);
  console.log('  → 指标好看的那一侧，省掉的是「问」与「切」；代价在半年后的复诊率上结算。');
  console.log('');
  console.log(`二、疗程效率：${f.packDays} 剂的两个拆法`);
  console.log(`  不拆：疗程内复诊 ${followUpVisits(f.packDays, f.packDays)} 次`);
  console.log(`  拆成 ${visits} 个 ${f.splitDays} 剂：复诊 ${visits} 次 → 虚增 ${(infl * 100).toFixed(0)}%，疗效未变`);
  console.log('  → 复诊率被号源策略操纵时，指标改善与临床改善之间只隔一次拆分。');
  console.log('');
  console.log(`三、资源效率：药房人力减掉 1/${f.cutShare}`);
  console.log('  → 验收、养护、复核都不产生收入，减员不被当期指标发现；');
  console.log('    第三年才在患者投诉与抽检不合格里出现，届时已无法归因。');
  console.log('');
  console.log('三种效率指向三个方向：三块表要同时挂，打架时哪块优先必须先写死。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；本章数据为演算设定，不指向任何真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成医疗管理、财务或医保结算意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, minutesPerPatient, followUpVisits, inflation };
