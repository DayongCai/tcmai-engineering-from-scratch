#!/usr/bin/env node
/**
 * 中医管理学 · 第 8 章 医共体的牌子挂上了，中医馆里没有人会开方
 * 课程: departments/06-guanli/03-zhongyi-guanli-xue/chapters/08-z38/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的两个差距都从正文取数后现算：
 *   建成 12 家 → 有能开方医师的 9 家 → 扣掉下派 6 名 → 常驻能独立开方 3 家 → 服务能力覆盖率
 *   12 家 × 每家日均 30 剂 → 集中采购的日剂数，以及分散采购的价差区间
 * 覆盖率与能力覆盖率并列打印，不取其一代替另一个。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '医共体的牌子挂上了，中医馆里没有人会开方';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label, conv) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const raw = String(m[1]).replace(/,/g, '');
  const n = conv === 'cn' ? cn(raw) : Number(raw);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + raw);
  return n;
}

/** 正文第 5、29 行的数据。 */
function facts(text) {
  return {
    homes: grab(text, /牵头\s*(\d+)\s*家乡镇卫生院/, '12 家卫生院'),
    withDoctor: grab(text, /(\d+)\s*家的中医馆只有\s*1\s*名能独立开方/, '9 家有医师'),
    dispatched: grab(text, /其中\s*(\d+)\s*名是县医院每周下派半天的医师/, '6 名为下派'),
    shortageHomes: grab(text, /(\d+)\s*家的饮片柜常年缺\s*\d+%/, '3 家缺 40%'),
    shortagePct: grab(text, /\d+\s*家的饮片柜常年缺\s*(\d+)%/, '3 家缺 40%'),
    dosesPerHome: grab(text, /每家日均\s*(\d+)\s*剂/, '每家 30 剂'),
    priceGapLow: grab(text, /高于集中采购([一二两三四五六七八九十]+)至/, '高一至两成', 'cn'),
    priceGapHigh: grab(text, /高于集中采购一至([一二两三四五六七八九十]+)成/, '高一至两成', 'cn'),
  };
}

function cn(s) {
  const d = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (!(s in d)) throw new Error('不认识的中文数字: ' + s);
  return d[s];
}

/** 常驻能独立开方的家数：有医师的家数减去靠下派的家数。 */
function residentHomes(withDoctor, dispatched) {
  const n = withDoctor - dispatched;
  if (n < 0) throw new Error('下派人次不能多于有医师的家数');
  return n;
}

/** 覆盖率：分子 ÷ 家数。建成率与能力率用同一个分母，才比得出来。 */
function coverage(num, homes) {
  if (!(homes > 0)) throw new Error('家数必须为正');
  return num / homes;
}

/** 集中采购的日剂数：家数 × 每家日均剂数。 */
function pooledDoses(homes, dosesPerHome) {
  return homes * dosesPerHome;
}

/** 分散采购的价差区间：集中采购金额 ×（1 + 上浮比例）。 */
function priceGap(amount, lowShare, highShare) {
  return { low: Math.round(amount * (1 + lowShare / 10)), high: Math.round(amount * (1 + highShare / 10)) };
}

function main() {
  const text = read();
  const f = facts(text);
  const resident = residentHomes(f.withDoctor, f.dispatched);
  const built = coverage(f.homes, f.homes);
  const capable = coverage(resident, f.homes);
  const pooled = pooledDoses(f.homes, f.dosesPerHome);
  const gap = priceGap(pooled, f.priceGapLow, f.priceGapHigh);

  console.log(`中医管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、两个覆盖率（同一个分母：${f.homes} 家卫生院）`);
  console.log(`  建成中医馆：${f.homes} 家 → ${(built * 100).toFixed(0)}%`);
  console.log(`  有能独立开方的医师：${f.withDoctor} 家，其中 ${f.dispatched} 名靠县医院每周下派半天`);
  console.log(`  常驻能独立开方：${resident} 家 → ${(capable * 100).toFixed(0)}%`);
  console.log(`  → 两个数字相差 ${((built - capable) * 100).toFixed(0)} 个百分点；差的不是同一件事。`);
  console.log('');
  console.log('二、集中采购的规模');
  console.log(`  ${f.homes} 家 × 每家日均 ${f.dosesPerHome} 剂 = ${pooled} 剂／日`);
  console.log(`  分散采购的单价高出 ${f.priceGapLow} 至 ${f.priceGapHigh} 成：同样 ${pooled} 剂，集中采购支出记为 100，分散采购为 ${gap.low} 至 ${gap.high}`);
  console.log('  → 品种齐全度同理：单一卫生院月用量不足 1 公斤的品种，供应商不愿配送。');
  console.log('  → 前提是验收能力：县级中药房按批留样，卫生院只做外观复核。');
  console.log('');
  console.log(`三、缺品种的那 ${f.shortageHomes} 家：缺 ${f.shortagePct}% 的品种`);
  console.log('  → 覆盖率的分子是「建成」，能力的分子是「能开方 + 有药 + 有人验收」；把三问答完，牌子才是牌子。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；覆盖率、剂数与价差均为演算设定。');
  console.log('※ 本输出仅用于教学演示，不构成政策解读、合规或投资意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, facts, residentHomes, coverage, pooledDoses, priceGap };
