#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 5 章 数据质量与统计上报：同一个数，三个分母
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/05-z115/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数从本章正文的演算段落读：床位数、三类床日、三套出院人数、抽检份数与错份数。
 * 复算：三个平均住院日（7.60 / 8.10 / 7.90）、两种床位使用率（91.5% / 88.5%）、抽检错误率与年结算偏差。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '数据质量与统计上报：同一个数，三个分母';

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
  return {
    beds: num(one(/编制 ([\d,]+) 床/, body, '编制床位数')),
    openBedDays: num(one(/实际开放总床日 ([\d,]+)/, body, '实际开放总床日')),
    occupiedBedDays: num(one(/实际占用总床日 ([\d,]+)/, body, '实际占用总床日')),
    dischargeBedDays: num(one(/出院者占用总床日 ([\d,]+)/, body, '出院者占用总床日')),
    discharges: num(one(/出院人数 ([\d,]+) 人/, body, '出院人数')),
    excludedShort: num(one(/剔除住院不足 24 小时的 ([\d,]+) 人/, body, '不足 24 小时人数')),
    excludedDead: num(one(/院内死亡 ([\d,]+) 人/, body, '院内死亡人数')),
    directDischarges: num(one(/出院人数 ([\d,]+)；分子改用/, body, '直报出院人数')),
    validDischarges: num(one(/有效出院人数 ([\d,]+)/, body, '有效出院人数')),
    monthly: num(one(/月出院 ([\d,]+) 例/, body, '月出院例数')),
    sampled: num(one(/抽 ([\d,]+) 份/, body, '抽检份数')),
    errors: num(one(/，([\d,]+) 份存在关键字段错误/, body, '关键字段错份数')),
    statedAnnual: num(one(/全年约 ([\d,]+) 份首页带错/, body, '全年带错份数')),
    weight: Number(one(/每份权重偏差 ([\d.]+)/, body, '权重偏差')),
    price: Number(one(/费率 ([\d.]+) 万元/, body, '费率')),
    statedDev: num(one(/年结算偏差约 ([\d,]+) 万元/, body, '年结算偏差')),
  };
}

/** 逻辑校验表：校验项 / 判据 / 处置。 */
function structure(body, tables) {
  const t = tables.find((x) => x.header.includes('校验') && x.header.includes('处置'));
  if (!t) throw new Error('正文里没找到逻辑校验表');
  const quad = ['分子', '分母', '口径', '时点'].filter((k) => body.includes(k)).length;
  const blockActions = t.rows.filter((r) => r[2] === '拦截').length;
  const hintActions = t.rows.filter((r) => r[2] === '提示复核').length;
  return { rules: t.rows.length, quad, blockActions, hintActions };
}

/** 复算：三个平均住院日、两种床位使用率、抽检错误率与年结算偏差。 */
function compute(p) {
  const inHouse = p.dischargeBedDays / p.discharges;
  const direct = p.occupiedBedDays / p.directDischarges;
  const perf = p.dischargeBedDays / p.validDischarges;
  const useOccupied = p.occupiedBedDays / p.openBedDays;
  const useDischarge = p.dischargeBedDays / p.openBedDays;
  const rate = p.errors / p.sampled;
  return {
    inHouse,
    direct,
    perf,
    inHouseFixed: inHouse.toFixed(2),
    directFixed: direct.toFixed(2),
    perfFixed: perf.toFixed(2),
    useOccupiedPct: (useOccupied * 100).toFixed(1),
    useDischargePct: (useDischarge * 100).toFixed(1),
    ratePct: (rate * 100).toFixed(1),
    dev: p.statedAnnual * p.weight * p.price,
    devInt: Math.round(p.statedAnnual * p.weight * p.price),
    bookedBedDays: p.beds * 365,
    directCheck: p.discharges - p.excludedShort - p.excludedDead,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  const must = [
    ['7.60 天', '院内平均住院日'],
    ['8.10 天', '直报平均住院日'],
    ['7.90 天', '绩效平均住院日'],
    ['91.5%', '床位使用率（实际占用）'],
    ['88.5%', '床位使用率（出院者占用）'],
    ['8.0%', '抽检错误率'],
    ['874 万元', '年结算偏差'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (c.bookedBedDays !== p.openBedDays) throw new Error('编制床日与实际开放总床日不符: ' + c.bookedBedDays);
  if (c.directCheck !== p.directDischarges) throw new Error('直报出院人数逻辑不符: ' + c.directCheck);
  if (c.inHouseFixed !== '7.60' || c.directFixed !== '8.10' || c.perfFixed !== '7.90') {
    throw new Error(`三个分母复算异常: ${c.inHouseFixed}/${c.directFixed}/${c.perfFixed}`);
  }
  if (s.quad !== 4) throw new Error('指标四件套数异常: ' + s.quad);
  if (s.blockActions !== 3) throw new Error('拦截条数异常: ' + s.blockActions);
  if (s.hintActions !== 3) throw new Error('提示条数异常: ' + s.hintActions);
}

function main() {
  const body = read();
  const s = structure(body, parseTables(body));
  const p = params(body);
  const c = compute(p);
  verify(c, s, p, body);

  console.log(`医院信息化与病案 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`同一个库、三个分母：`);
  console.log(`  院内　　${p.dischargeBedDays} ÷ ${p.discharges} = ${c.inHouseFixed} 天`);
  console.log(`  直报　　${p.occupiedBedDays} ÷ ${p.directDischarges} = ${c.directFixed} 天`);
  console.log(`  绩效　　${p.dischargeBedDays} ÷ ${p.validDischarges} = ${c.perfFixed} 天`);
  console.log(`床位使用率：实际占用 ${c.useOccupiedPct}% / 出院者占用 ${c.useDischargePct}%（编制床日 ${c.bookedBedDays}）`);
  console.log(`剔除逻辑核对：${p.discharges} − ${p.excludedShort} − ${p.excludedDead} = ${c.directCheck}`);
  console.log('');
  console.log(`抽检：${p.monthly}/月，抽 ${p.sampled} 份错 ${p.errors} 份 → ${c.ratePct}%；全年约 ${p.statedAnnual} 份 → 偏差 ${c.dev.toFixed(1)} 万元（正文取 ${p.statedDev}）`);
  console.log(`逻辑校验 ${s.rules} 条：拦截 ${s.blockActions} · 提示 ${s.hintActions}（混设会让规则失效）`);
  console.log('');
  console.log('※ 三个数都合规，差异在口径；不要试图把它们统一成一个数。');
  console.log('※ 本输出仅用于教学演示，不构成统计口径解释或考核依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify };
