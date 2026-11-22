#!/usr/bin/env node
/**
 * 中医管理学 · 第 3 章 名医工作室的成本，记在导师的号源上
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/03-z33/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章三笔量都从正文取数后现算：
 *   半日可看人次（工时 ÷ 单次分钟）、每生每半日上手人次、三年累计主诊；
 *   每周号源折算成年号源，再与一位主治医师的年门诊量比出一个比例；
 *   挂出号源与「按 12 分钟真看得完」的人次之差。
 * 正文与本节演的算不一致时，这里会把两个数都打出来，不取平均、不做掩饰。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '名医工作室的成本，记在导师的号源上';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function cn(s) {
  const d = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
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

/** 正文第 5、31、33 行的演算设定。 */
function facts(text) {
  return {
    halfDayHours: grab(text, /一个半日门诊([一二两三四五六七八九十]+)小时/, '半日门诊四小时', 'cn'),
    minutesPerVisit: grab(text, /按每位患者\s*(\d+)\s*分钟计/, '每位患者 12 分钟'),
    students: grab(text, /导师与([一二两三四五六七八九十]+)名学生同诊/, '三名学生', 'cn'),
    perStudentLow: grab(text, /每个学生每半日能上手\s*(\d+)\s*至/, '每生 6 至 7 人'),
    perStudentHigh: grab(text, /每半日能上手\s*\d+\s*至\s*(\d+)\s*人/, '每生 6 至 7 人'),
    halfDaysPerWeek: grab(text, /每周([一二两三四五六七八九十]+)个半天/, '每周两个半天', 'cn'),
    weeksPerYear: grab(text, /每年\s*(\d+)\s*周/, '每年 44 周'),
    years: grab(text, /一位学生([一二两三四五六七八九十]+)年累计主诊/, '三年累计', 'cn'),
    cumulativeClaim: grab(text, /累计主诊约\s*([\d,]+)\s*人次/, '约 1,150 人次'),
    diseaseShare: grab(text, /三年内出现在门诊的比例若为\s*(\d+)%/, '病种比例 8%'),
    casesClaim: grab(text, /只有约\s*(\d+)\s*例/, '约 90 例'),
    slotsPerWeek: grab(text, /每周\s*(\d+)\s*个号源/, '每周 120 个号源'),
    weekShareClaim: grab(text, /约等于一位主治医师全年门诊量的([一二两三四五六七八九十]+)分之一/, '全年门诊量的三分之一', 'cn'),
  };
}

/** 半日可看人次：工时 × 60 ÷ 单次分钟。 */
function perHalfDay(hours, minutesPerVisit) {
  return (hours * 60) / minutesPerVisit;
}

/** 学生同诊时每人的上手人次：可看人次 ÷（学生数 + 导师参与点评的折减）。 */
function perStudentPerHalfDay(visits, students) {
  return visits / students;
}

/** 三年累计主诊 = 每半日 × 每周半天 × 每年周数 × 年数。 */
function cumulative(perHalf, halfDaysPerWeek, weeksPerYear, years) {
  return perHalf * halfDaysPerWeek * weeksPerYear * years;
}

/** 号源成本：每周号源 × 每年周数，再折成「一位主治年门诊量」的份额。 */
function slotCost(slotsPerWeek, weeksPerYear, attendingYearly) {
  const yearly = slotsPerWeek * weeksPerYear;
  return { yearly, share: yearly / attendingYearly };
}

function main() {
  const text = read();
  const f = facts(text);
  const visits = perHalfDay(f.halfDayHours, f.minutesPerVisit);
  const perStudent = perStudentPerHalfDay(visits, f.students);
  const ceiling = cumulative(perStudent, f.halfDaysPerWeek, f.weeksPerYear, f.years);
  const attendingYearly = f.slotsPerWeek * f.weeksPerYear * f.weekShareClaim;
  const cost = slotCost(f.slotsPerWeek, f.weeksPerYear, attendingYearly);
  const cases = f.cumulativeClaim * (f.diseaseShare / 100);
  const slotsPerHalfDay = f.slotsPerWeek / f.halfDaysPerWeek;

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log('一、产能天花板');
  console.log(`  半日 ${f.halfDayHours} 小时 ÷ 每位 ${f.minutesPerVisit} 分钟 = ${visits} 人`);
  console.log(`  ${f.students} 名学生轮流主诊 → 每生每半日 ${perStudent.toFixed(1)} 人（正文：${f.perStudentLow} 至 ${f.perStudentHigh} 人）`);
  console.log(`  × 每周 ${f.halfDaysPerWeek} 个半天 × 每年 ${f.weeksPerYear} 周 × ${f.years} 年 = ${cumulative(perStudent, f.halfDaysPerWeek, f.weeksPerYear, f.years).toFixed(0)} 人次（上限）`);
  console.log(`  正文按实际上手比例取 ${f.cumulativeClaim} 人次，约为上限的 ${((f.cumulativeClaim / ceiling) * 100).toFixed(0)}%`);
  console.log(`  × 病种占比 ${f.diseaseShare}% = ${cases.toFixed(0)} 例（正文：约 ${f.casesClaim} 例）——够写医案，不够形成判断。`);
  console.log('');
  console.log('二、号源成本');
  console.log(`  每周 ${f.slotsPerWeek} 个号源 × ${f.weeksPerYear} 周 = ${cost.yearly} 号／年`);
  console.log(`  折合一位主治医师年门诊量（${attendingYearly.toLocaleString('en-US')} 号）的 1/${f.weekShareClaim}，即 ${(cost.share * 100).toFixed(1)}%`);
  console.log(`  每半日挂出 ${slotsPerHalfDay} 个号，而按 ${f.minutesPerVisit} 分钟只看得完 ${visits} 人`);
  console.log(`  → 挂出量是可行量的 ${(slotsPerHalfDay / visits).toFixed(1)} 倍；差额靠压缩单次时间消化，这就是成本看不见的另一半。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；例数与时长均为演算设定。');
  console.log('※ 本输出仅用于教学演示，不构成人事、劳动、职称评审或人才项目申报意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, perHalfDay, perStudentPerHalfDay, cumulative, slotCost };
