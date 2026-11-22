#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 6 章 统计分析与病案：首页是一张会被结算和评审同时读的表
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/06-i6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读：本例住院天数、主诊断换码的权重差、口径造成的住院日差幅、内涵质控抽样比例。
 * 现算：口径差占住院日的百分比（足以让科室排名换位）、权重差相对一个 CMI 的比例、
 * 以及指标表里「一个指标两种分母」带来的可能取值数。
 * 正文任何一格改动，本脚本都会报出偏差。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '统计分析与病案：首页是一张会被结算和评审同时读的表';

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
  return m;
};

function params(body) {
  const los = one(/住院 (\d+) 天，出院时首页主诊断/, body, '本例住院天数')[1];
  const w = one(/权重差 ([\d.]+) 上下/, body, '权重差');
  const d = one(/相差 ([\d.]+)–([\d.]+) 天/, body, '住院日差幅');
  const s = one(/抽 (\d+)% 做内涵质控/, body, '内涵质控抽样比例');
  return {
    los: Number(los),
    weightDiff: Number(w[1]),
    diffMin: Number(d[1]),
    diffMax: Number(d[2]),
    samplePct: Number(s[1]),
  };
}

/** 结构清点：首页三组读法、主要诊断三规则三反例、入组失败四类、指标五行、字典八项。 */
function structure(body, tables) {
  const head = tables.find((t) => t.header[0] === '组');
  const fail = tables.find((t) => t.header[0] === '失败类型');
  const ind = tables.find((t) => t.header[0] === '指标');
  const dict = tables.find((t) => t.header[0] === '项');
  if (!head || !fail || !ind || !dict) throw new Error('正文表格没找全');
  const count = (re) => (body.match(re) || []).length;
  return {
    首页三组: head.rows.length,
    入组失败: fail.rows.length,
    指标数: ind.rows.length,
    字典项: dict.rows.length,
    两种分母: ind.rows.filter((r) => String(r[2]).includes('/')).length,
    规则条数: count(/^\d\. \*\*/gm),
    反例条数: count(/^- (?:肺炎入院|肿瘤患者|转院病人)/gm),
    dictNames: dict.rows.map((r) => r[0]),
  };
}

/** 复算：口径差占住院日的比例、权重差相对 CMI=1 的比例、一个指标的取值数。 */
function compute(p, s) {
  return {
    spreadMinPct: (p.diffMin / p.los) * 100,
    spreadMaxPct: (p.diffMax / p.los) * 100,
    losLow: p.los - p.diffMax,
    losHigh: p.los + p.diffMax,
    weightPct: p.weightDiff * 100,
    valueOptions: s.指标数 * 2,
  };
}

function verify(c, p, s, body) {
  if (!body.includes('0.3–0.8 天')) throw new Error('正文里的住院日差幅不见了');
  if (!body.includes('分母之争')) throw new Error('正文缺「分母之争」判据');
  if (s.首页三组 !== 3) throw new Error('首页三组读法行数异常: ' + s.首页三组);
  if (s.入组失败 !== 4) throw new Error('入组失败类型行数异常: ' + s.入组失败);
  if (s.指标数 !== 5) throw new Error('指标表行数异常: ' + s.指标数);
  if (s.字典项 !== 8) throw new Error('指标字典项数异常: ' + s.字典项);
  if (s.两种分母 !== 5) throw new Error('每个指标应有两种分母写法: ' + s.两种分母);
  if (!(c.spreadMaxPct > c.spreadMinPct)) throw new Error('差幅下界不应大于上界');
  if (!(c.spreadMaxPct > 6 && c.spreadMaxPct < 7)) throw new Error('口径差占比异常: ' + c.spreadMaxPct);
  if (!(p.samplePct === 5)) throw new Error('内涵质控抽样比例异常: ' + p.samplePct);
}

function main() {
  const body = read();
  const p = params(body);
  const s = structure(body, parseTables(body));
  const c = compute(p, s);
  verify(c, p, s, body);

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`本例住院 ${p.los} 天；主诊断换与不换，权重差 ${p.weightDiff} 上下（按 CMI=1 记，相当于 ${c.weightPct.toFixed(0)}%）`);
  console.log(`口径差 ${p.diffMin}–${p.diffMax} 天 → 住院日 ${c.losLow}–${c.losHigh} 天，占本例 ${c.spreadMinPct.toFixed(1)}%–${c.spreadMaxPct.toFixed(1)}%`);
  console.log(`  → 同一批数据、只换分母，科室排名足以换位`);
  console.log('');
  console.log(`结构清点：首页 ${s.首页三组} 组读法 · 主诊断 ${s.规则条数} 条规则 / ${s.反例条数} 个反例 · 入组失败 ${s.入组失败} 类`);
  console.log(`  指标 ${s.指标数} 个，每个两种分母 → ${c.valueOptions} 种可能取值；指标字典 ${s.字典项} 项`);
  console.log(`  字典项：${s.dictNames.join('、')}`);
  console.log(`  内涵质控抽样 ${p.samplePct}%（全量形式质控 + 分层抽样内涵质控）`);
  console.log('');
  console.log('※ 指标争议十次有八次是分母之争；写清分母比改算法更有效。');
  console.log('※ 本输出仅用于教学演示，不构成医保结算或绩效分配建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify };
