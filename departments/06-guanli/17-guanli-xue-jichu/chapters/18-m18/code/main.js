#!/usr/bin/env node
/**
 * 管理学基础 · 第 18 章 这门课真正的作业，是回去改一件你科室里的事
 * 课程: departments/06-guanli/17-guanli-xue-jichu/chapters/18-m18/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章是全课的收束，所以脚本做的是本课自己的账：
 *   一、规模：内容章、单元、汉字底本、带单位的数值表述各是多少；
 *   二、通读与研读的学时，以及两者之比——读懂比读完贵得多；
 *   三、两种学习方式的行为改变率之差，即「接上岗位」那一步值多少。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 18;
const TITLE = '这门课真正的作业，是回去改一件你科室里的事';

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

/** 正文第 5 行的课程规模与两组学习效果。 */
function facts(text) {
  return {
    chapters: grab(text, /本课([零一二两三四五六七八九十百千万]+)个内容章/, '十八个内容章', 'cn'),
    units: grab(text, /([零一二两三四五六七八九十百千万]+)个单元/, '一百九十八个单元', 'cn'),
    hanzi: grab(text, /([零一二两三四五六七八九十百千万]+)汉字底本/, '二十八万二千八百八十八', 'cn'),
    values: grab(text, /数值类表述([零一二两三四五六七八九十百千万]+)处/, '一千四百四十处', 'cn'),
    readHours: grab(text, /通读一遍约([零一二两三四五六七八九十百千万]+)小时/, '十五小时', 'cn'),
    studyHours: grab(text, /计，约([零一二两三四五六七八九十百千万]+)小时/, '六十小时', 'cn'),
    listenPct: grab(text, /行为改变率约([一二三四五六七八九十]+)成/, '一成', 'cn') * 10,
    practicePct: grab(text, /约([一二三四五六七八九十]+)成（合成示例）/, '四成', 'cn') * 10,
    charsPerMinute: grab(text, /按每分钟([零一二两三四五六七八九十百千万]+)字计/, '三百字', 'cn'),
  };
}

/** 按每分钟字数折算纯通读时长。 */
function readHoursBySpeed(hanzi, charsPerMinute) {
  if (!(charsPerMinute > 0)) throw new Error('速度必须为正');
  return hanzi / charsPerMinute / 60;
}

/** 研读时长是通读的几倍。 */
const studyRatio = (studyHours, readHours) => {
  if (!(readHours > 0)) throw new Error('通读时长必须为正');
  return studyHours / readHours;
};

/** 两种学习方式的行为改变率之差（百分点）。 */
const behaviorGap = (practicePct, listenPct) => practicePct - listenPct;

function main() {
  const text = read();
  const f = facts(text);
  const hours = readHoursBySpeed(f.hanzi, f.charsPerMinute);
  const ratio = studyRatio(f.studyHours, f.readHours);
  const gapPoints = behaviorGap(f.practicePct, f.listenPct);

  console.log(`管理学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 取数后现算）');
  console.log('');
  console.log(`一、规模：${f.chapters} 个内容章、${f.units} 个单元、${f.hanzi.toLocaleString('en-US')} 汉字底本`);
  console.log(`  带单位的数值类表述 ${f.values.toLocaleString('en-US')} 处`);
  console.log(`  按每分钟 ${f.charsPerMinute} 字计，纯通读约 ${hours.toFixed(1)} 小时（正文：约 ${f.readHours} 小时）`);
  console.log('');
  console.log(`二、研读约 ${f.studyHours} 小时，是通读的 ${ratio.toFixed(1)} 倍`);
  console.log('  → 读懂、做题、找依据的代价远高于读完；只读完一章，等于只拿到结论。');
  console.log('');
  console.log(`三、行为改变率：只听课 ${f.listenPct}%，听课 + 在岗实践 + 结构反馈 ${f.practicePct}%，差 ${gapPoints} 个百分点`);
  console.log('  → 这 ${gapPoints} 个百分点不是知识，是把知识接到自己岗位上的那一步。');
  console.log('');
  console.log('四、六步练法：描述现象带数 → 定位断点 → 只找一个理论 → 只改一处 → 定指标与中止条件 → 观察四周复盘');
  console.log('  → 卡在第二步，说明对这条链的理解还停在名词层面；跑不通的地方本身就带着信息。');
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即报错或随之变化；学时与行为改变率为合成示例，不构成学习效果承诺。');
  console.log('※ 本输出仅用于教学演示，不构成教学效果承诺、技术评估意见或管理咨询意见。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  CHAPTER,
  TITLE,
  read,
  cnInt,
  facts,
  readHoursBySpeed,
  studyRatio,
  behaviorGap,
};
