#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 8 章 智慧医院与规划：评级是体检报告，不是成绩单
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/08-z118/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数从本章正文的病例与投资结构段读：累计投入、年运维、必填项与弹窗数、门诊人次与每人次耗时。
 * 复算：运维占建设费比例、五年总持有成本区间、必填项挤占的日耗工时；并清点四套评级体系与四块投资结构。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '智慧医院与规划：评级是体检报告，不是成绩单';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseTables(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\|(.+)\|\s*$/);
    if (!m) { cur = null; continue; }
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); } else { cur.rows.push(cells); }
  }
  return out;
}

const one = (re, body, name) => {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到' + name);
  return m[1];
};
const num = (s) => Number(String(s).replace(/,/g, ''));

function params(body) {
  const five = body.match(/五年总持有成本约 ([\d,]+) 万到 ([\d,]+) 万元/);
  if (!five) throw new Error('正文里没找到五年总持有成本');
  return {
    investment: num(one(/累计投入 ([\d,]+) 万元/, body, '累计投入')),
    maintenance: num(one(/运维费涨到 ([\d,]+) 万元/, body, '年运维费')),
    levelFrom: num(one(/应用水平从 (\d+) 级推到/, body, '起点级别')),
    levelTo: num(one(/推到 (\d+) 级/, body, '目标级别')),
    requiredFields: num(one(/门诊加了 (\d+) 个必填项/, body, '新增必填项')),
    popups: num(one(/住院加了 (\d+) 个强制弹窗/, body, '新增弹窗')),
    extraMinutes: num(one(/书写时间多了 (\d+) 分钟/, body, '增加书写时间')),
    visitsPerDay: num(one(/门诊 ([\d,]+) 人次\/日/, body, '门诊人次')),
    secondsPerVisit: num(one(/每人次多花 (\d+) 秒/, body, '每人次多耗秒数')),
    baseline: num(one(/一套 ([\d,]+) 万元的系统/, body, '基准系统造价')),
    maintLowPct: num(one(/年运维在 (\d+) 万到/, body, '运维下限')),
    maintHighPct: num(one(/万到 (\d+) 万元之间/, body, '运维上限')),
    fiveYearLow: num(five[1]),
    fiveYearHigh: num(five[2]),
    adoptionPct: (() => {
      const CN2 = { 一: 10, 两: 20, 二: 20, 三: 30, 四: 40, 五: 50 };
      const k = one(/采纳率长期低于([一二三四五六七八九十两]+)成/, body, '提醒采纳率下限');
      return CN2[k];
    })(),
  };
}

/** 四套评级体系与四块投资结构。 */
function structure(tables) {
  const rating = tables.find((x) => x.header.includes('体系') && x.header.includes('判定方式'));
  const invest = tables.find((x) => x.header.includes('支出') && x.header.includes('说明'));
  if (!rating) throw new Error('正文里没找到评级体系表');
  if (!invest) throw new Error('正文里没找到投资结构表');
  return {
    ratings: rating.rows.length,
    ratingNames: rating.rows.map((r) => r[0]),
    investParts: invest.rows.length,
    investNames: invest.rows.map((r) => r[0]),
  };
}

/** 复算：运维占比、五年持有区间、必填项挤占的日耗工时。 */
function compute(p) {
  const maintPct = (p.maintenance / p.investment) * 100;
  const dailySeconds = p.visitsPerDay * p.secondsPerVisit;
  return {
    maintPct,
    maintPctFixed: maintPct.toFixed(1),
    aboveRange: maintPct > 15,
    fiveYearLow: p.baseline + 5 * p.maintLowPct,
    fiveYearHigh: p.baseline + 5 * p.maintHighPct,
    dailySeconds,
    dailyHours: (dailySeconds / 3600).toFixed(1),
    levelGap: p.levelTo - p.levelFrom,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  const must = [
    ['4,000 万元', '累计投入'],
    ['620 万元', '年运维'],
    ['47 个必填项', '新增必填项'],
    ['12 个强制弹窗', '新增弹窗'],
    ['1,500 万到 1,750 万元', '五年持有成本'],
    ['谁在用、用来干什么', '成绩单缺的一格'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (s.ratings !== 4) throw new Error('评级体系数异常: ' + s.ratings);
  if (s.investParts !== 4) throw new Error('投资结构块数异常: ' + s.investParts);
  if (c.fiveYearLow !== p.fiveYearLow || c.fiveYearHigh !== p.fiveYearHigh) {
    throw new Error(`五年成本复算异常: ${c.fiveYearLow}–${c.fiveYearHigh}`);
  }
  if (Math.round(c.dailySeconds / 3600) !== 22) throw new Error('日耗工时复算异常: ' + c.dailyHours);
  if (!c.aboveRange) throw new Error('运维占比应略超经验区间上限: ' + c.maintPctFixed);
}

function main() {
  const body = read();
  const s = structure(parseTables(body));
  const p = params(body);
  const c = compute(p);
  verify(c, s, p, body);

  console.log(`医院信息化与病案 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`评级 ${p.levelFrom} → ${p.levelTo} 级（跨 ${c.levelGap} 级），累计投入 ${p.investment.toLocaleString('en-US')} 万元`);
  console.log(`年运维 ${p.maintenance} 万元 → 占累计投入 ${c.maintPctFixed}%（经验区间 10%–15%，本年略超上限）`);
  console.log(`基准系统 ${p.baseline.toLocaleString('en-US')} 万元：年运维 ${p.maintLowPct}–${p.maintHighPct} 万 → 五年总持有 ${c.fiveYearLow.toLocaleString('en-US')}–${c.fiveYearHigh.toLocaleString('en-US')} 万元`);
  console.log(`必填项 ${p.requiredFields} 个 + 弹窗 ${p.popups} 个 → 门诊 ${p.visitsPerDay} 人次 × ${p.secondsPerVisit} 秒 = 日耗 ${c.dailyHours} 小时`);
  console.log(`临床反馈的书写增加量：${p.extraMinutes} 分钟/人`);
  console.log('');
  console.log(`结构清点：评级体系 ${s.ratings} 套（${s.ratingNames.join('、')}）；投资 ${s.investParts} 块（${s.investNames.join('、')}）`);
  console.log('');
  console.log('※ 评级是体检报告，不是成绩单；过级之后的两年，才是系统真正被使用的两年。');
  console.log('※ 本输出仅用于教学演示，不构成评级申报指导或投资决策意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify };
