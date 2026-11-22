#!/usr/bin/env node
/**
 * 管理学基础 · 第 6 章 战略不是决定做什么，是决定不做什么
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/06-m6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取出学科建设经费、专科数、进入第一梯队的最小投入，现算两件事：
 *   一、平均分配时每个方向拿多少、有几家能跨过门槛；
 *   二、同样的钱集中投放时能跨过门槛几家，以及平均分配每家的缺口。
 * 结论由算术给出，不由态度给出：门槛存在时，摊薄在数上等价于全部不达标。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '战略不是决定做什么，是决定不做什么';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 正文写的是「八个」「三个」，这里只认一到十，认不出就报错。 */
function cnNum(s, label) {
  if (!(s in CN)) throw new Error('认不出的中文数字：' + label + ' = ' + s);
  return CN[s];
}

function grab(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  const n = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error('「' + label + '」取到的不是数: ' + m[1]);
  return n;
}

/** 取原文片段（中文数字用），不走 Number。 */
function grabRaw(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」，章节是否已被改写？');
  return m[1];
}

/** 正文第 5 行与第 71 行的全部设定。 */
function facts(text) {
  return {
    totalWan: grab(text, /五年学科建设经费\s*([\d,]+)\s*万元/, '经费 6,000 万元'),
    units: cnNum(grabRaw(text, /规划写了([一二三四五六七八九十]+)个重点建设专科/, '八个专科'), '八个专科'),
    equalShareWan: grab(text, /每个约\s*([\d,]+)\s*万元/, '每个 750 万元'),
    equalQualified: grab(text, /八个专科各\s*[\d,]+\s*万元，\*\*达标数为\s*(\d+)\*\*/, '达标数为 0'),
    minScaleWan: grab(text, /单个投入普遍在\s*([\d,]+)\s*万元以上/, '门槛 1,800 万元'),
    focusedUnits: cnNum(grabRaw(text, /；([一二三四五六七八九十]+)个专科各\s*[\d,]+\s*万元，\*\*达标数为/, '三个专科'), '三个专科'),
    focusedShareWan: grab(text, /；[一二三四五六七八九十]+个专科各\s*([\d,]+)\s*万元/, '每个 2,000 万元'),
    focusedQualified: grab(text, /；[一二三四五六七八九十]+个专科各\s*[\d,]+\s*万元，\*\*达标数为\s*(\d+)\*\*/, '达标数为 3'),
  };
}

/** 平均分配：每个方向拿多少。 */
function equalShare(totalWan, units) {
  if (!(units > 0)) throw new Error('方向数必须为正');
  return totalWan / units;
}

/** 同样的钱能同时满足几个方向的最低有效规模。 */
function qualifyingUnits(totalWan, minScaleWan) {
  if (!(minScaleWan > 0)) throw new Error('门槛必须为正');
  return Math.floor(totalWan / minScaleWan);
}

/** 平均分配下每个方向离门槛还差多少。 */
function shortfallWan(shareWan, minScaleWan) {
  return Math.max(0, minScaleWan - shareWan);
}

function main() {
  const text = read();
  const f = facts(text);
  const share = equalShare(f.totalWan, f.units);
  const maxUnits = qualifyingUnits(f.totalWan, f.minScaleWan);
  const gap = shortfallWan(share, f.minScaleWan);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、摊薄：${f.totalWan} 万元 ÷ ${f.units} 个方向 = 每个 ${share.toFixed(0)} 万元`);
  console.log(`  进入第一梯队的门槛 ${f.minScaleWan} 万元，每个方向还差 ${gap.toFixed(0)} 万元`);
  console.log(`  平均分配下达标数 ${f.equalQualified}（与算术一致：${f.totalWan} ÷ ${f.minScaleWan} 向下取整 = ${maxUnits}）`);
  console.log('  → 钱花得一分不差，没有一个方向跨过门槛；摊薄在数上等价于全部不达标。');
  console.log('');
  console.log(`二、集中：同样的钱做 ${f.focusedUnits} 个方向 = 每个 ${f.focusedShareWan} 万元`);
  console.log(`  门槛 ${f.minScaleWan} 万元，达标数 ${f.focusedQualified}`);
  console.log(`  → 不是「集中一定更好」的教条：门槛存在时它才成立，所以第一步是先问清门槛在哪。`);
  console.log('');
  console.log('三、两问与三层：在哪里竞争、凭什么赢；总体—业务—职能三层是换算关系');
  console.log('  → 职能战略才是真战略，因为它决定钱和人往哪走；资源表上没有的方向，不在战略里。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；6,000 万、750 万、1,800 万为演算设定，不对应真实评审标准。');
  console.log('※ 本输出仅用于教学演示，不构成管理咨询意见、区域卫生规划建议或投资建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  equalShare,
  qualifyingUnits,
  shortfallWan,
};
