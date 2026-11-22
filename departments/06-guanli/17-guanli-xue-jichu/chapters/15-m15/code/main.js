#!/usr/bin/env node
/**
 * 管理学基础 · 第 15 章 伦理不是不做坏事，是在没人看见且有好处时还选择不做
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/15-m15/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取投诉总量、过度检查类投诉、检查收入占比与同级均值差，现算：
 *   一、过度检查投诉在投诉结构里的份额；
 *   二、检查收入占比与同级均值的差，以及均值反推；
 *   三、认知分裂：认为「有收入压力」与认为「自己不会多开」的两个比例为何能同时成立。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 15;
const TITLE = '伦理不是不做坏事，是在没人看见且有好处时还选择不做';

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

/** 正文第 5 行的投诉结构与收入结构。 */
function facts(text) {
  return {
    complaints: grab(text, /收到投诉([零一二两三四五六七八九十百千万]+)件/, '二百一十四件', 'cn'),
    overService: grab(text, /过度治疗[^类]{0,3}类([零一二两三四五六七八九十百千万]+)件/, '四十七件', 'cn'),
    overSharePct: grab(text, /占\s*(\d+)%；/, '22%'),
    examRevenuePct: grab(text, /检查收入占医疗收入\s*([\d.]+)%/, '31.8%'),
    gapPoints: grab(text, /高\s*([\d.]+)\s*个百分点/, '6.4 个百分点'),
    pressurePct: grab(text, /(\d+)%\s*的医师认为/, '78%'),
    selfCleanPct: grab(text, /(\d+)%\s*认为[^自]{0,4}自己不会/, '91%'),
  };
}

/** 份额 = 分子 ÷ 分母。 */
function share(pct_of, total) {
  if (!(total > 0)) throw new Error('总量必须为正');
  if (pct_of > total) throw new Error('分子不能大于总量');
  return (pct_of / total) * 100;
}

/** 由占比与差值反推同级均值。 */
function peerAverage(ownPct, gapPoints) {
  return ownPct - gapPoints;
}

function main() {
  const text = read();
  const f = facts(text);
  const overRate = share(f.overService, f.complaints);
  const peer = peerAverage(f.examRevenuePct, f.gapPoints);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、投诉 ${f.complaints} 件，其中过度检查类 ${f.overService} 件，占 ${overRate.toFixed(1)}%（正文 ${f.overSharePct}%）`);
  console.log(`  检查收入占医疗收入 ${f.examRevenuePct}%，比同级均值高 ${f.gapPoints} 个百分点 → 均值约 ${peer.toFixed(1)}%`);
  console.log('  → 收入结构把经济后果嵌进每一次临床决策，个人操守抵不过结构。');
  console.log('');
  console.log(`二、两个都真的数：${f.pressurePct}% 认为科室有收入压力，${f.selfCleanPct}% 认为自己不会为收入多开检查`);
  console.log(`  两者之差 ${(f.selfCleanPct - f.pressurePct).toFixed(0)} 个百分点`);
  console.log('  → 压力不以命令出现，它藏在指标、排名与绩效系数里；所以行为会被推着走而不自知。');
  console.log('');
  console.log('三、三问连用：对谁有好处（功利）· 人人如此是否还行得通（义务）· 我愿意被这样对待吗（德性）');
  console.log('  → 三问答不到一起时，通常说明这件事不该做，而不是算不出最优解。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；214 件、47 件、31.8% 为合成示例。');
  console.log('※ 本输出仅用于教学演示，不构成法律意见、合规审查结论或对任何机构与个人的评价。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, cnInt, facts, share, peerAverage };
