#!/usr/bin/env node
/**
 * 管理学基础 · 第 16 章 信息化不是把纸搬到屏幕上，是让决策在数据到达的地方发生
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/16-m16/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取系统数、每人每天登录与切换次数、找数据时长、报表差额，现算：
 *   一、一次切换摊到每个系统是多少次，一天被切成多少段；
 *   二、点对点集成的接口数按 n² 增长是多少条，与集成平台的线性值差多少倍；
 *   三、结论落到「系统越多，数据越碎」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 16;
const TITLE = '信息化不是把纸搬到屏幕上，是让决策在数据到达的地方发生';

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

/** 正文第 5 行的一组信息化投入与使用数据。 */
function facts(text) {
  return {
    investmentWan: grab(text, /信息化投入([零一二两三四五六七八九十百千万]+)万元/, '四千一百万', 'cn'),
    systems: grab(text, /上线系统([零一二两三四五六七八九十百千万]+)个/, '二十七个', 'cn'),
    loginsPerDay: grab(text, /平均每天登录\s*([\d.]+)\s*个系统/, '6.2 个系统'),
    switchesPerDay: grab(text, /切换\s*(\d+)\s*次/, '41 次'),
    findMinutesPerShift: grab(text, /约\s*(\d+)\s*分钟\/班/, '52 分钟'),
    reportGapDays: grab(text, /相差\s*([\d.]+)\s*天/, '1.8 天'),
  };
}

/** 每次登录平均伴随多少次切换。 */
function switchesPerSystem(switches, systems) {
  if (!(systems > 0)) throw new Error('系统数必须为正');
  return switches / systems;
}

/** 点对点集成的接口对数：两两一条。 */
function pointToPointLinks(systems) {
  if (!(systems >= 2)) throw new Error('系统数至少为 2');
  return (systems * (systems - 1)) / 2;
}

/** 集成平台的接口条数：每个系统只与平台对接。 */
const platformLinks = (systems) => systems;

/** 两种做法的倍数关系。 */
function linkRatio(systems) {
  return pointToPointLinks(systems) / platformLinks(systems);
}

function main() {
  const text = read();
  const f = facts(text);
  const perSystem = switchesPerSystem(f.switchesPerDay, f.loginsPerDay);
  const pairs = pointToPointLinks(f.systems);
  const ratio = linkRatio(f.systems);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、投入 ${f.investmentWan} 万元、上线 ${f.systems} 个系统`);
  console.log(`  每人每天登录 ${f.loginsPerDay} 个系统、切换 ${f.switchesPerDay} 次（平均每个系统 ${perSystem.toFixed(1)} 次）`);
  console.log(`  用于找数据约 ${f.findMinutesPerShift} 分钟/班；汇总数与病案首页相差 ${f.reportGapDays} 天`);
  console.log('  → 系统越多，数据越碎；投入越大，决策越慢。这不是技术问题，是信息架构问题。');
  console.log('');
  console.log(`二、集成方式：${f.systems} 个系统点对点 = ${pairs} 条接口；集成平台 = ${platformLinks(f.systems)} 条`);
  console.log(`  相差 ${ratio.toFixed(1)} 倍 → 接口维护必然失控，这也是「三选一」里点对点最先被淘汰的原因。`);
  console.log('');
  console.log('三、三层不在一个东西上：数据（记录）· 信息（有语境可解释）· 知识（可行动的判断）');
  console.log('  → 报表停在数据层，是因为没有人把数字翻成一句可判断的话；一致性缺失，则所有汇总数都要打折。');
  console.log('');
  console.log(`※ 数字由本章正文现算，正文一改即报错或随之变化；${f.investmentWan} 万元与 ${f.systems} 个系统为合成示例。`);
  console.log('※ 本输出仅用于教学演示，不构成技术方案、采购建议或合规意见。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  cnInt,
  facts,
  switchesPerSystem,
  pointToPointLinks,
  platformLinks,
  linkRatio,
};
