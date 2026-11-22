#!/usr/bin/env node
/**
 * 中医管理学 · 第 6 章 中药房是成本中心，也是唯一不能省的那道关
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/06-z36/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的三笔账都从正文取数后现算：
 *   日均剂数 ÷ 在岗药师 → 每人每日剂数（在岗与编制两版并列）
 *   验收品种 × 每品种秒数 → 占一个工作日的比例（用来否掉「没时间」这个解释）
 *   抽检不合格数 ÷ 抽检数 → 不合格率
 *   治未病收入中评估与随访的占比（用来说明结构）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
/** 一个工作日按 8 小时计——正文未给工时，这是算负荷的通用的分母，不取自正文。 */
const WORKDAY_HOURS = 8;
const TITLE = '中药房是成本中心，也是唯一不能省的那道关';

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

/** 正文第 5、13、29、45 行的数据。 */
function facts(text) {
  return {
    dailyDoses: grab(text, /日均调剂\s*(\d+)\s*剂/, '日均 600 剂'),
    staff: grab(text, /药师\s*(\d+)\s*人/, '药师 5 人'),
    establishment: grab(text, /编制\s*(\d+)\s*人/, '编制 8 人'),
    typesPerDay: grab(text, /日均验收\s*(\d+)\s*个品种/, '日均验收 40 个品种'),
    secondsPerType: grab(text, /每品种看性状约\s*(\d+)\s*秒/, '每品种 20 秒'),
    badMoist: grab(text, /(\d+)\s*个品种水分超标/, '3 个品种水分超标'),
    badForged: grab(text, /(\d+)\s*个品种掺伪/, '1 个品种掺伪'),
    totalIncome: grab(text, /年收入\s*(\d+)\s*万元/, '年收入 780 万元'),
    coreIncome: grab(text, /合计\s*(\d+)\s*万元/, '评估与随访 96 万元'),
    coreShareClaim: grab(text, /占\s*(\d+)%/, '占 12%'),
  };
}

/** 每人每日剂数：按在岗与按编制各算一版。 */
function perPharmacist(dailyDoses, staff) {
  return dailyDoses / staff;
}

/** 验收负荷：品种 × 秒数，折成分钟与占一个工作日的比例。 */
function inspectionLoad(types, seconds, shiftHours) {
  const sec = types * seconds;
  const minutes = sec / 60;
  const shiftMinutes = shiftHours * 60;
  return { seconds: sec, minutes, share: minutes / shiftMinutes };
}

/** 不合格率：抽检不合格数 ÷ 抽检数。 */
function rejectRate(bad, sampled) {
  if (!(sampled > 0)) throw new Error('抽检数必须为正');
  return bad / sampled;
}

/** 收入结构：某一块占多少。 */
function share(part, total) {
  return part / total;
}

function main() {
  const text = read();
  const f = facts(text);
  const badTotal = f.badMoist + f.badForged;
  const load = inspectionLoad(f.typesPerDay, f.secondsPerType, WORKDAY_HOURS);
  const core = share(f.coreIncome, f.totalIncome);

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log('一、调剂人力');
  console.log(`  日均 ${f.dailyDoses} 剂 ÷ 在岗 ${f.staff} 人 = 每人每日 ${perPharmacist(f.dailyDoses, f.staff).toFixed(0)} 剂`);
  console.log(`  若按编制 ${f.establishment} 人计 = 每人每日 ${perPharmacist(f.dailyDoses, f.establishment).toFixed(1)} 剂`);
  console.log(`  → 缺编 ${f.establishment - f.staff} 人，缺口由加班与实习生填；表现出来的是候药时间，不是差错率。`);
  console.log('');
  console.log('二、验收负荷（用来检验「没时间」这个解释）');
  console.log(`  ${f.typesPerDay} 个品种 × ${f.secondsPerType} 秒 = ${load.seconds} 秒 = ${load.minutes.toFixed(1)} 分钟`);
  console.log(`  占一个 ${WORKDAY_HOURS} 小时工作日的 ${(load.share * 100).toFixed(1)}%`);
  console.log('  → 时间不是瓶颈，判据才是：20 秒只够看性状外观，硫熏与掺伪看不出来。');
  console.log('');
  console.log(`三、抽检：${f.typesPerDay} 个品种里 ${badTotal} 个不合格 = ${(rejectRate(badTotal, f.typesPerDay) * 100).toFixed(0)}%`);
  console.log('  → 这个比例落在「换供应商」与「改验收规程」之间，本章选后者。');
  console.log('');
  console.log('四、治未病的收入结构');
  console.log(`  评估与随访 ${f.coreIncome} 万元 ÷ 全年 ${f.totalIncome} 万元 = ${(core * 100).toFixed(1)}%（正文：${f.coreShareClaim}%）`);
  console.log(`  其余 ${(100 - core * 100).toFixed(1)}% 是推拿、艾灸、膏方与理疗——项目不是治未病，是它的邻居。`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；剂数、人数与收入结构均为演算设定。');
  console.log('※ 本输出仅用于教学演示，不构成药事管理、药品质量检验或合同法律意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, perPharmacist, inspectionLoad, rejectRate, share };
