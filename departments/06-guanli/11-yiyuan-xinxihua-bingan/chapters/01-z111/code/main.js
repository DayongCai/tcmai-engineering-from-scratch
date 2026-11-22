#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 1 章 医院信息系统的构成：系统不是模块清单，是记录的分布图
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/01-z111/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数全部从本章正文现读：两套执行率、系统套数与单套年可用率、落点表行数、对时阈值、PDA 配置。
 * 复算：执行率缺口、串联可用率（0.995 的 N 次方）、断点数（落点数减一）。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '医院信息系统的构成：系统不是模块清单，是记录的分布图';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** Markdown 表格切成 { header, rows }；分隔行不计。 */
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

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function cnNum(s) {
  const t = String(s || '');
  if (!t) return NaN;
  if (t === '十') return 10;
  if (t.length === 1) return CN[t] === undefined ? NaN : CN[t];
  if (t.length === 2) {
    if (t[0] === '十') return 10 + CN[t[1]];
    if (t[1] === '十') return CN[t[0]] * 10;
    return NaN;
  }
  if (t.length === 3 && t[1] === '十') return CN[t[0]] * 10 + CN[t[2]];
  return NaN;
}

const one = (re, body, name) => {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到' + name);
  return m[1];
};

/** 从正文的病例与演算段落读参数。 */
function params(body) {
  const both = body.match(/得 ([\d.]+)%；[\s\S]{0,60}?取数，得 ([\d.]+)%/);
  if (!both) throw new Error('正文里没找到两套执行率');
  return {
    hisRate: Number(both[1]),
    mobileRate: Number(both[2]),
    systems: cnNum(one(/([一二三四五六七八九十]+)套系统串起来/, body, '系统套数')),
    uptimePct: Number(one(/每套年可用率都是 ([\d.]+)%/, body, '单套年可用率')),
    statedChain: Number(one(/理论可用率约 ([\d.]+)%/, body, '串联可用率')),
    syncMinutes: Number(one(/每 (\d+) 分钟与院内时间服务器对时/, body, '对时间隔')),
    skewSeconds: Number(one(/偏差超过 (\d+) 秒即告警/, body, '对时偏差阈值')),
    pdaBeds: Number(one(/(\d+) 张床的病区配/, body, 'PDA 配置床位数')),
  };
}

/** 落点表：环节/落点/主键/写入方/断链后的表现。 */
function structure(body, tables) {
  const hopTable = tables.find((t) => t.header.includes('落点') && t.header.includes('主键'));
  if (!hopTable) throw new Error('正文里没找到六处落点表');
  const stages = ['开立', '审核', '执行', '计费', '记录', '摘要'].filter((k) => body.includes(k)).length;
  const chain = ['开立', '审核', '执行', '记录', '评价'].filter((k) => body.includes(k)).length;
  return {
    hops: hopTable.rows.length,
    hopNames: hopTable.rows.map((r) => r[0]),
    breakpoints: hopTable.rows.length - 1,
    stages,
    chain,
  };
}

/** 复算：执行率缺口、串联可用率、断点数。 */
function compute(p, s) {
  const gap = p.hisRate - p.mobileRate;
  const chainRate = Math.pow(p.uptimePct / 100, p.systems);
  return {
    gap,
    gapInt: Math.round(gap),
    chainRate,
    chainPct: (chainRate * 100).toFixed(1),
    breakpoints: s.hops - 1,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  const must = [
    [`${c.gapInt} 个百分点`, '执行率缺口'],
    [`${c.chainPct}%`, '串联可用率'],
    ['六处落点', '落点数'],
    ['五个可能的断点', '断点数'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (s.hops !== 6) throw new Error('落点表行数异常: ' + s.hops);
  if (c.breakpoints !== 5) throw new Error('断点数异常: ' + c.breakpoints);
  if (s.chain !== 5) throw new Error('闭环环节数异常: ' + s.chain);
  if (p.pdaBeds !== 30) throw new Error('PDA 配置床位数异常: ' + p.pdaBeds);
}

function main() {
  const body = read();
  const s = structure(body, parseTables(body));
  const p = params(body);
  const c = compute(p, s);
  verify(c, s, p, body);

  console.log(`医院信息化与病案 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`两套执行率：HIS 医嘱 ${p.hisRate}% · 移动护理扫码 ${p.mobileRate}% → 缺口 ${c.gap.toFixed(1)} 个百分点（${c.gapInt}）`);
  console.log(`一次用药留下 ${s.hops} 处记录（${s.hopNames.join('、')}），即 ${c.breakpoints} 个可能断点`);
  console.log(`${p.systems} 套系统串联，每套可用率 ${p.uptimePct}% → 理论可用率 ${c.chainPct}%`);
  console.log(`对时：每 ${p.syncMinutes} 分钟对一次，偏差超过 ${p.skewSeconds} 秒告警；闭环 ${s.chain} 个环节`);
  console.log(`PDA 配置基准：${p.pdaBeds} 张床的病区配 4–6 台`);
  console.log('');
  console.log('※ 缺口与串联可用率的作用不是精确，而是说明断点要按记录比对去找，不按模块清单去数。');
  console.log('※ 本输出仅用于教学演示，不构成系统选型或接口设计意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify, cnNum };
