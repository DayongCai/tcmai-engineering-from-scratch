#!/usr/bin/env node
/**
 * 管理学基础 · 第 12 章 说过了不等于传到了，传到了不等于懂了
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/12-m12/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取「收到」与「说得出」两个比例、交接缺失的例数与总数，现算：
 *   一、从收到到说得出，损耗了多少；
 *   二、交接信息缺失在不良事件里占多大份额；
 *   三、两份比例与根因份额的关系——四道关里丢在哪一道。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 12;
const TITLE = '说过了不等于传到了，传到了不等于懂了';

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

/** 正文第 5 行的那组抽查。 */
function facts(text) {
  return {
    policies: grab(text, /下发([零一二两三四五六七八九十百千万]+)份制度/, '四十二份', 'cn'),
    nurses: grab(text, /抽查([零一二两三四五六七八九十百千万]+)名护士/, '一百二十名', 'cn'),
    receivedPct: grab(text, /收到过文件[^的]{0,4}的占\s*(\d+)%/, '81%'),
    recallPct: grab(text, /三条以上要求的占\s*(\d+)%/, '37%'),
    events: grab(text, /不良事件([零一二两三四五六七八九十百千万]+)起/, '七十八起', 'cn'),
    handoverEvents: grab(text, /交接信息缺失[^的]{0,4}的([零一二两三四五六七八九十百千万]+)起/, '三十一起', 'cn'),
    handoverSharePct: grab(text, /起，占\s*([\d.]+)%/, '39.7%'),
  };
}

/** 到达率：说得出的人数 ÷ 说收到的人数。 */
function arrivalRate(receivedPct, recallPct) {
  if (!(receivedPct > 0)) throw new Error('收到比例必须为正');
  if (recallPct > receivedPct) throw new Error('说得出的人数不应多于收到的人数');
  return (recallPct / receivedPct) * 100;
}

/** 根因份额。 */
function rootShare(events, affected) {
  if (!(events > 0)) throw new Error('事件总数必须为正');
  return (affected / events) * 100;
}

function main() {
  const text = read();
  const f = facts(text);
  const arrival = arrivalRate(f.receivedPct, f.recallPct);
  const share = rootShare(f.events, f.handoverEvents);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、${f.policies} 份制度、${f.nurses} 名护士抽得：收到 ${f.receivedPct}%、说得出三条 ${f.recallPct}%`);
  console.log(`  从收到到说得出，只剩 ${arrival.toFixed(1)}%（丢 ${(100 - arrival).toFixed(1)}%）`);
  console.log('  → 丢的不是文件，是理解；四道关里只查了第一道。');
  console.log('');
  console.log(`二、不良事件 ${f.events} 起，根因指向交接信息缺失 ${f.handoverEvents} 起，占 ${share.toFixed(1)}%（正文：${f.handoverSharePct}%）`);
  console.log('  → 一次交接丢掉的信息，几小时后由另一个人承担后果；这是结构损耗，不是口才问题。');
  console.log('');
  console.log('三、四道断点：编码（没想清）· 通道（选错媒介）· 解码（语义不同）· 反馈（没有回读）');
  console.log('  → 修法各不相同：编码靠先定判断，通道靠丰富度规则，解码靠回读，反馈靠提问权入流程。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；42 份、120 名、37% 与 81% 为合成示例。');
  console.log('※ 本输出仅用于教学演示，不构成医患沟通规范、法律意见或管理咨询意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, cnInt, facts, arrivalRate, rootShare };
