#!/usr/bin/env node
/**
 * 管理学基础 · 第 13 章 控制不是抓住谁的错，是让偏差在还来得及的时候出现
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/13-m13/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取终末质控甲级率、抽查份数与不合格份数，现算：
 *   一、两个口径的差：甲级率与运行病历问题率相差多少个百分点；
 *   二、严重不良事件在上报总量里的份额；
 *   三、结论落到「查的与被查的是不是同一个东西」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 13;
const TITLE = '控制不是抓住谁的错，是让偏差在还来得及的时候出现';

const D = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const U = { 十: 10, 百: 100, 千: 1000, 万: 10000 };

function cnInt(s) {
  if (!/^[零一二两三四五六七八九十百千万]+$/.test(s)) throw new Error('认不出的中文数字: ' + s);
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of s) {
    if (ch in D) { num = D[ch]; continue; }
    const unit = U[ch];
    if (unit === 10000) { section = (section + num) * unit; total += section; section = 0; num = 0; }
    else { if (num === 0) num = 1; section += num * unit; num = 0; }
  }
  return total + section + num;
}

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label, conv) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = conv === 'cn' ? cnInt(m[1]) : Number(m[1]);
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 正文第 5 行的质控对照。 */
function facts(text) {
  return {
    reports: grab(text, /上报不良事件([零一二两三四五六七八九十百千万]+)起/, '四百一十二起', 'cn'),
    severe: grab(text, /级及以上([零一二两三四五六七八九十百千万]+)起/, '三十七起', 'cn'),
    gradeAPct: grab(text, /甲级率\s*([\d.]+)%/, '96.8%'),
    sampled: grab(text, /抽查([零一二两三四五六七八九十百千万]+)份/, '两百份', 'cn'),
    defective: grab(text, /([零一二两三四五六七八九十百千万]+)份存在/, '六十一份', 'cn'),
    defectivePct: grab(text, /，占\s*([\d.]+)%/, '30.5%'),
  };
}

/** 问题率 = 不合格份数 ÷ 抽查份数。 */
function defectRate(defective, sampled) {
  if (!(sampled > 0)) throw new Error('抽查份数必须为正');
  if (defective > sampled) throw new Error('不合格份数不能多于抽查份数');
  return (defective / sampled) * 100;
}

/** 两个口径相差多少个百分点。 */
function caliberGap(gradeAPct, defectPctv) {
  return gradeAPct - (100 - defectPctv);
}

function main() {
  const text = read();
  const f = facts(text);
  const rate = defectRate(f.defective, f.sampled);
  const gap = caliberGap(f.gradeAPct, rate);
  const severeShare = (f.severe / f.reports) * 100;

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、两个口径：终末质控甲级率 ${f.gradeAPct}%；运行中病历抽查 ${f.sampled} 份、问题 ${f.defective} 份 = ${rate.toFixed(1)}%`);
  console.log(`  两个口径相差 ${gap.toFixed(1)} 个百分点`);
  console.log('  → 甲级率查的是「有没有签」，问题率看的是「对不对得上」；指标漂亮与实质问题并存。');
  console.log('');
  console.log(`二、上报 ${f.reports} 起，Ⅲ级及以上 ${f.severe} 起，占 ${severeShare.toFixed(1)}%`);
  console.log('  → 上报量本身不说明质量；把上报多当管理差，得到的一定是瞒报。');
  console.log('');
  console.log('三、三段的成本：前馈（准入与验收）→ 同期（查对与审核）→ 反馈（分析与复盘）');
  console.log('  → 控制点前移一格，代价降一个数量级；只严在反馈段，是用最贵的方式学习。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；412 起、96.8%、30.5%、200 份为合成示例。');
  console.log('※ 本输出仅用于教学演示，不构成质量管理评价、责任认定意见或管理咨询意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, cnInt, facts, defectRate, caliberGap };
