#!/usr/bin/env node
/**
 * 管理学基础 · 第 10 章 领导不是让人听话，是让人在没有你的时候也肯多走一步
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/10-m10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文取两次测评的分数与培训学时，现算：
 *   一、业务能力与留任意愿的落差，培训前后各是多少；
 *   二、这点落差有没有被培训改变；
 *   三、培训学时摊到每个人头上是多少，为什么工时投入换不来结构改变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '领导不是让人听话，是让人在没有你的时候也肯多走一步';

const D = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const U = { 十: 10, 百: 100, 千: 1000, 万: 10000 };

/** 汉字整数（三十一、九十六、九），只覆盖本章出现的量级。 */
function cnInt(s) {
  if (!/^[零一二三四五六七八九十百千万]+$/.test(s)) throw new Error('认不出的中文数字: ' + s);
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

/** 正文第 5 行的一次测评与一年后的复测。 */
function facts(text) {
  return {
    directors: grab(text, /([零一二三四五六七八九十百千万]+)名科主任/, '三十一名', 'cn'),
    abilityScore: grab(text, /业务能力[^评]{0,3}评分均值\s*([\d.]+)/, '4.6'),
    stayScore: grab(text, /再干三年[^评]{0,3}评分均值\s*([\d.]+)/, '3.1'),
    trainingHours: grab(text, /共([零一二三四五六七八九十百千万]+)学时/, '九十六学时', 'cn'),
    afterAbility: grab(text, /两个分数是\s*([\d.]+)\s*和/, '4.7'),
    afterStay: grab(text, /两个分数是\s*[\d.]+\s*和\s*([\d.]+)/, '3.2'),
  };
}

/** 两个分数之间的落差（评分保留一位小数，先规整再比，避免浮点尾巴）。 */
const gap = (a, b) => Number(Math.abs(a - b).toFixed(4));

/** 人均学时。 */
function hoursPerHead(totalHours, headcount) {
  if (!(headcount > 0)) throw new Error('人数必须为正');
  return totalHours / headcount;
}

function main() {
  const text = read();
  const f = facts(text);
  const before = gap(f.abilityScore, f.stayScore);
  const after = gap(f.afterAbility, f.afterStay);
  const perHead = hoursPerHead(f.trainingHours, f.directors);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、${f.directors} 名科主任的两次评分：业务能力 ${f.abilityScore}，愿意再干三年 ${f.stayScore}，落差 ${before.toFixed(1)}`);
  console.log('  → 同一批人身上，能力被认可而追随意愿不足；这不是能力问题，是权力来源结构问题。');
  console.log('');
  console.log(`二、${f.trainingHours} 学时培训之后：${f.afterAbility} 与 ${f.afterStay}，落差 ${after.toFixed(1)}`);
  console.log(`  落差变化 ${(after - before).toFixed(1)} → 一项没变，两项一起抬了 0.1`);
  console.log('  → 培训把表达练顺了，却没碰到「凭什么让人跟」：职位权力耗尽，专家与参照权力没长出来。');
  console.log('');
  console.log(`三、人均 ${perHead.toFixed(1)} 学时`);
  console.log('  → 工时能买到课程，买不到「不在场时那句话还被不被执行」；后者要靠授权、免责与示范。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；4.6、3.1、九十六学时为合成示例，不对应真实机构。');
  console.log('※ 本输出仅用于教学演示，不构成人事评价意见、干部任免建议或管理咨询意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, cnInt, facts, gap, hoursPerHead };
