#!/usr/bin/env node
/**
 * 管理学基础 · 第 11 章 钱买到的是不反对，不是多做一点
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/11-m11/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取职工数、绩效总额与三项调查比例，现算：
 *   一、人均绩效，以及它摊到「多干两成」上是多少；
 *   二、愿意多干的人数与认为「干多干少差别不大」的人数，两者同时成立的结构；
 *   三、结论落到三层线上：算得清、信它、够得着。
 * 钱的总量是给定的，能动的是结构与口径。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '钱买到的是不反对，不是多做一点';

const D = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const U = { 十: 10, 百: 100, 千: 1000, 万: 10000 };

/** 汉字整数（一千二百、三千六百、三万）。 */
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

/** 正文第 5 行的三个数与绩效总量。 */
function facts(text) {
  return {
    staff: grab(text, /([零一二三四五六七八九十百千万]+)名职工/, '一千二百名', 'cn'),
    totalWan: grab(text, /绩效总额([零一二三四五六七八九十百千万]+)万元/, '三千六百万元', 'cn'),
    perCapitaWan: grab(text, /人均([零一二三四五六七八九十百千万]+)万/, '人均三万', 'cn'),
    indifferentPct: grab(text, /(\d+)%\s*认为[^干]{0,3}干多干少差别不大/, '62%'),
    unreadablePct: grab(text, /(\d+)%\s*认为[^绩]{0,3}绩效方案看不懂/, '48%'),
    willingPct: grab(text, /愿意的占\s*(\d+)%/, '71%'),
    extraPct: grab(text, /多干能多拿([一二两三四五六七八九十]+)成/, '两成', 'cn') * 10,
  };
}

/** 人均绩效（万元）。 */
function perCapita(totalWan, staff) {
  if (!(staff > 0)) throw new Error('人数必须为正');
  return totalWan / staff;
}

/** 某一比例对应的人数。 */
function headcount(staff, pct) {
  if (pct < 0 || pct > 100) throw new Error('比例应在 0–100 之间');
  return (staff * pct) / 100;
}

/** 若把「多干两成」兑现，总额需要增加多少（万元）。 */
function extraBudgetWan(totalWan, extraPct) {
  return (totalWan * extraPct) / 100;
}

function main() {
  const text = read();
  const f = facts(text);
  const per = perCapita(f.totalWan, f.staff);
  const willing = headcount(f.staff, f.willingPct);
  const indifferent = headcount(f.staff, f.indifferentPct);
  const extra = extraBudgetWan(f.totalWan, 20);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、账：${f.staff} 名职工、绩效总额 ${f.totalWan} 万元，人均 ${per.toFixed(1)} 万元（正文：${f.perCapitaWan} 万）`);
  console.log('  → 总量受管控，能动的是结构与口径，不是总额。');
  console.log('');
  console.log(`二、三个数同时成立：`);
  console.log(`  认为「干多干少差别不大」 ${f.indifferentPct}% ≈ ${indifferent.toFixed(0)} 人`);
  console.log(`  认为「绩效方案看不懂」 ${f.unreadablePct}% ≈ ${headcount(f.staff, f.unreadablePct).toFixed(0)} 人`);
  console.log(`  愿意多干两成多拿       ${f.willingPct}% ≈ ${willing.toFixed(0)} 人`);
  console.log(`  把「多干两成」全部兑现需要增加 ${extra.toFixed(0)} 万元（总额的 20%）`);
  console.log('  → 意愿在 71%，算术与信任却没接上；不接上，加钱只是抬高地板。');
  console.log('');
  console.log('三、三层线：我算得清（口径）、我信它（程序公平）、我够得着（门槛可达）');
  console.log('  → 保障层决定人来不来，成长层与意义层决定人做多好；把两层混在一个方案里，钱花了投入不变。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；三千六百万、人均三万、62/48/71% 为合成示例。');
  console.log('※ 本输出仅用于教学演示，不构成薪酬设计方案、绩效分配办法或人事处理依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, cnInt, facts, perCapita, headcount, extraBudgetWan };
