#!/usr/bin/env node
/**
 * 中医管理学 · 第 7 章 门诊流程是按检查设计的，病人却是来复诊调方的
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/07-z37/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的量都从正文取数后现算：
 *   在院 96 分钟的四个分段 → 各段占比 → 候药是否为最大一段
 *   改造后 78 分钟 → 省下的分钟数，与「候药压到 15 分钟」省下的分钟数比较
 *   一间诊室半日 4 小时按 10 分钟计的理论产能与实际区间 → 折扣率
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '门诊流程是按检查设计的，病人却是来复诊调方的';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function cn(s) {
  const d = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
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

/** 正文第 5、15、17、19 行的数据。 */
function facts(text) {
  return {
    dailyVisits: grab(text, /门诊\s*([\d,]+)\s*人次／日/, '门诊 3,000 人次／日'),
    followUpShare: grab(text, /复诊占\s*(\d+)%/, '复诊占 62%'),
    totalBefore: grab(text, /平均在院\s*(\d+)\s*分钟/, '平均在院 96 分钟'),
    visit: grab(text, /就诊\s*(\d+)\s*分钟/, '就诊 9 分钟'),
    waiting: grab(text, /候诊\s*(\d+)\s*分钟/, '候诊 31 分钟'),
    pharmacyWait: grab(text, /候药\s*(\d+)\s*分钟/, '候药 34 分钟'),
    admin: grab(text, /缴费与移动\s*(\d+)\s*分钟/, '缴费与移动 22 分钟'),
    totalAfter: grab(text, /在院时间降到\s*(\d+)\s*分钟/, '降到 78 分钟'),
    pharmacyAfter: grab(text, /候药仍是\s*(\d+)\s*分钟/, '候药仍 30 分钟'),
    halfDayHours: grab(text, /半日\s*(\d+)\s*小时/, '半日 4 小时'),
    minutesPerVisit: grab(text, /单次\s*(\d+)\s*分钟计/, '单次 10 分钟'),
    actualLow: grab(text, /落在\s*(\d+)\s*至/, '18 至 20 人次'),
    actualHigh: grab(text, /落在\s*\d+\s*至\s*(\d+)\s*人次/, '18 至 20 人次'),
  };
}

/** 四段相加是否等于在院总时长——正文自己的账先对一遍。 */
function sumSegments(f) {
  return f.visit + f.waiting + f.pharmacyWait + f.admin;
}

/** 各段占比，按分钟降序。 */
function shares(f) {
  const segs = [
    { name: '就诊', minutes: f.visit },
    { name: '候诊', minutes: f.waiting },
    { name: '候药', minutes: f.pharmacyWait },
    { name: '缴费与移动', minutes: f.admin },
  ];
  return segs
    .map((s) => ({ ...s, share: s.minutes / f.totalBefore }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** 一间诊室的理论产能与实际折扣率。 */
function roomCapacity(hours, minutesPerVisit, actual) {
  const theoretical = (hours * 60) / minutesPerVisit;
  return { theoretical, discount: actual / theoretical };
}

function main() {
  const text = read();
  const f = facts(text);
  const sum = sumSegments(f);
  const ranked = shares(f);
  const saved = f.totalBefore - f.totalAfter;
  const pharmacySaving = f.pharmacyWait - 15;
  const capLow = roomCapacity(f.halfDayHours, f.minutesPerVisit, f.actualLow);
  const capHigh = roomCapacity(f.halfDayHours, f.minutesPerVisit, f.actualHigh);

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、在院 ${f.totalBefore} 分钟的分解（四段相加 = ${sum} 分钟）`);
  for (const s of ranked) {
    console.log(`  ${s.name}：${String(s.minutes).padStart(2)} 分钟（${(s.share * 100).toFixed(1)}%）`);
  }
  console.log(`  → 最大的一段是${ranked[0].name}；复诊占 ${f.followUpShare}%，这一段的性质是「等药」而不是「等诊断」。`);
  console.log('');
  console.log('二、改造收益与瓶颈收益的比较');
  console.log(`  三年流程改造：${f.totalBefore} → ${f.totalAfter} 分钟，省 ${saved} 分钟，候药仍是 ${f.pharmacyAfter} 分钟`);
  console.log(`  把候药压到 15 分钟：省 ${pharmacySaving} 分钟（${pharmacySaving > saved ? '大于' : '不大于'}三年改造的 ${saved} 分钟）`);
  console.log('  → 找瓶颈的方法很笨：在高峰时段站在每个节点数人数与等待时间，一天就能数清楚。');
  console.log('');
  console.log('三、一间诊室的产能');
  console.log(`  半日 ${f.halfDayHours} 小时按 ${f.minutesPerVisit} 分钟计：理论 ${capLow.theoretical.toFixed(0)} 人次`);
  console.log(`  实际落在 ${f.actualLow} 至 ${f.actualHigh} 人次，折扣率 ${(capLow.discount * 100).toFixed(0)}% 至 ${(capHigh.discount * 100).toFixed(0)}%`);
  console.log('  → 折扣率各机构不同，必须实测，不能套用。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；时长与人次均为演算设定。');
  console.log('※ 本输出仅用于教学演示，不构成医院运营、价格管理或医保结算意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, sumSegments, shares, roomCapacity };
