#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 8 章 规划与智慧医疗：规划不是买系统，是决定五年后哪些数据还在
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/08-i8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读：系统数、年数、点对点接口数、厂商数、排期月数、可用性与年宕机小时。
 * 现算三件事：
 *   1. 由年宕机 43 小时复算可用性，看是否与正文的 99.5% 自洽；
 *   2. 11 套系统的全互联上限 n(n−1)/2，与实际 60 条的差额——超出的部分是重复链路；
 *   3. 结构清点：规划四步、治理三层、互联互通四级、四诊四类、评价四层。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '规划与智慧医疗：规划不是买系统，是决定五年后哪些数据还在';

const HOURS_PER_YEAR = 365 * 24;

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

const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cnNum = (s) => (/^\d+$/.test(s) ? Number(s) : CN[s]);

function params(body) {
  const y = one(/([一二两三四五六七八九十])年上了 (\d+) 个系统/, body, '系统数与年数');
  const g = one(/系统之间有 (\d+) 条点对点接口/, body, '点对点接口数');
  const v = one(/要协调 (\d+) 家厂商、排期(两|[\d]+)个月/, body, '厂商与排期');
  const a = one(/核心系统可用性 ([\d.]+)%，年宕机 (\d+) 小时/, body, '可用性与宕机小时');
  return {
    systems: Number(y[2]),
    years: cnNum(y[1]),
    interfaces: Number(g[1]),
    vendors: Number(v[1]),
    months: cnNum(v[2]),
    availability: Number(a[1]),
    downtimeHours: Number(a[2]),
  };
}

/** 结构清点：四步规划、三层治理、四级互联互通、四诊、评价四层。 */
function structure(body, tables) {
  const lvl = tables.find((t) => t.header[0] === '级');
  const four = tables.find((t) => t.header[0] === '类别');
  if (!lvl) throw new Error('正文里没找到互联互通分级表');
  if (!four) throw new Error('正文里没找到四诊表');
  const has = (k) => body.includes(k);
  const groups = {
    规划四步: ['**基线**', '**目标**', '**路径**', '**保障**'],
    治理三层: ['委员会管方向与预算', '工作组管跨部门协调', '信息科管执行与运维'],
    评价四层: ['**投入**', '**产出**', '**效果**', '**影响**'],
    智慧三线: ['智慧医疗', '智慧服务', '智慧管理'],
  };
  const out = { 互联互通级数: lvl.rows.length, 四诊类数: four.rows.length };
  for (const [k, list] of Object.entries(groups)) {
    const hit = list.filter(has);
    if (hit.length !== list.length) throw new Error(k + '不全，缺: ' + list.filter((s) => !has(s)).join('、'));
    out[k] = hit.length;
  }
  return out;
}

const mesh = (n) => (n * (n - 1)) / 2;

/** 复算：可用性自洽性、全互联上限与重复链路。 */
function compute(p) {
  const up = HOURS_PER_YEAR - p.downtimeHours;
  return {
    uptimePct: (up / HOURS_PER_YEAR) * 100,
    meshMax: mesh(p.systems),
    excess: p.interfaces - mesh(p.systems),
    systemsPerYear: p.systems / p.years,
    vendorPerInterface: p.vendors / p.interfaces,
  };
}

function verify(c, p, s, body) {
  if (c.uptimePct.toFixed(1) !== p.availability.toFixed(1)) {
    throw new Error(`可用性不自洽：由 ${p.downtimeHours} 小时宕机复算 ${c.uptimePct.toFixed(2)}%，正文写 ${p.availability}%`);
  }
  if (c.meshMax !== 55) throw new Error('11 套系统的全互联上限应为 55，实际 ' + c.meshMax);
  if (!(c.excess > 0)) throw new Error('实际接口数未超过全互联上限，重复链路结论不成立');
  if (s.互联互通级数 !== 4) throw new Error('互联互通分级表行数异常: ' + s.互联互通级数);
  if (s.四诊类数 !== 4) throw new Error('四诊表行数异常: ' + s.四诊类数);
  for (const k of ['60 条点对点接口', '99.5%', '点对点之债', '架构复盘']) {
    if (!body.includes(k)) throw new Error('正文缺关键判据: ' + k);
  }
}

function main() {
  const body = read();
  const p = params(body);
  const s = structure(body, parseTables(body));
  const c = compute(p);
  verify(c, p, s, body);

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`${p.years} 年上 ${p.systems} 个系统，约 ${c.systemsPerYear.toFixed(1)} 个/年；接口 ${p.interfaces} 条，涉及 ${p.vendors} 家厂商`);
  console.log(`可用性 ${p.availability}% × ${HOURS_PER_YEAR} 小时 → 年宕机 ${p.downtimeHours} 小时；由宕机反算 ${c.uptimePct.toFixed(2)}%，与正文自洽`);
  console.log('');
  console.log(`${p.systems} 套系统全互联上限 n(n−1)/2 = ${c.meshMax} 条；实际 ${p.interfaces} 条，超出 ${c.excess} 条`);
  console.log(`  → 已越过全互联：同一对系统之间存在重复链路，改一个字段要协调 ${p.vendors} 家厂商、排期 ${p.months} 个月是必然结果`);
  console.log('');
  console.log(`结构清点：规划 ${s.规划四步} 步 · 治理 ${s.治理三层} 层 · 互联互通 ${s.互联互通级数} 级 · 四诊 ${s.四诊类数} 类 · 评价 ${s.评价四层} 层 · 智慧 ${s.智慧三线} 条线`);
  console.log('');
  console.log('※ 还债靠闸门（新接口一律经集成平台）+ 接口台账，不是靠一次重写。');
  console.log('※ 本输出仅用于教学演示，不构成建设规划或评审辅导建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, HOURS_PER_YEAR, read, parseTables, params, structure, mesh, compute, verify };
