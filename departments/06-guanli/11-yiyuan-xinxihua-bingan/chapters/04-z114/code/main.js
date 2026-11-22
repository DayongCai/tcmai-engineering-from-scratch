#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 4 章 病案首页与主诊断：一个诊断选错，整组都错
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/04-z114/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数从本章正文的演算段落读：年出院例数、抽检份数、错份数、权重偏差、费率。
 * 复算：抽样错误率 → 全年带错份数 → 年结算偏差；合并症权重差的金额区间。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '病案首页与主诊断：一个诊断选错，整组都错';

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
    discharges: num(one(/年出院 ([\d,]+) 例/, body, '年出院例数')),
    sampled: num(one(/抽 ([\d,]+) 份复核/, body, '抽检份数')),
    errors: num(one(/，([\d,]+) 份存在上述四类错误之一/, body, '错份数')),
    statedRate: Number(one(/抽样错误率 ([\d.]+)%/, body, '抽样错误率')),
    statedBad: num(one(/全年约 ([\d,]+) 份首页带错/, body, '全年带错份数')),
    weight: Number(one(/每份权重偏差平均 ([\d.]+)/, body, '权重偏差')),
    price: Number(one(/费率 ([\d.]+) 万元/, body, '费率')),
    statedDev: num(one(/年结算偏差约 ([\d,]+) 万元/, body, '年结算偏差')),
    mergedLow: Number(one(/权重差常在 ([\d.]+) 到/, body, '合并症权重差下限')),
    mergedHigh: Number(one(/到 ([\d.]+) 之间/, body, '合并症权重差上限')),
    gapYuan: num(one(/结算差了 ([\d,]+) 元/, body, '两台结算差')),
    purposes: ['病组结算', '质量监测上报', '绩效考核', '等级评审', '院内科室核算']
      .filter((k) => body.includes(k)).length,
  };
}

/** 入组失败故障表：类型 / 现象 / 后果 / 查验方法。 */
function structure(body, tables) {
  const t = tables.find((x) => x.header.includes('类型') && x.header.includes('查验方法'));
  if (!t) throw new Error('正文里没找到入组失败故障表');
  const crit = ['本次住院的主要就医原因', '对健康危害最大', '一般应为确诊诊断']
    .filter((k) => body.includes(k)).length;
  const admissionStates = ['临床未确定', '情况不明'].filter((k) => body.includes(k)).length + 2;
  return {
    failTypes: t.rows.length,
    failNames: t.rows.map((r) => r[0]),
    crit,
    admissionStates,
  };
}

/** 复算：错误率 → 全年带错 → 年结算偏差；合并症权重差折成金额。 */
function compute(p) {
  const rate = p.errors / p.sampled;
  const bad = Math.round(p.discharges * rate);
  const dev = bad * p.weight * p.price; // 万元
  return {
    rate,
    ratePct: (rate * 100).toFixed(1),
    bad,
    dev,
    devInt: Math.round(dev),
    mergedLowYuan: p.mergedLow * p.price * 10000,
    mergedHighYuan: p.mergedHigh * p.price * 10000,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  if (c.ratePct !== p.statedRate.toFixed(1)) throw new Error(`错误率不符: 算 ${c.ratePct}% / 正文 ${p.statedRate}%`);
  if (c.bad !== p.statedBad) throw new Error(`全年带错不符: 算 ${c.bad} / 正文 ${p.statedBad}`);
  if (c.devInt !== p.statedDev) throw new Error(`结算偏差不符: 算 ${c.devInt} / 正文 ${p.statedDev}`);
  const must = [
    ['15.5%', '错误率'],
    ['465 份', '全年带错份数'],
    ['195 万元', '结算偏差'],
    ['3,600 到 6,000 元', '合并症金额区间'],
    ['两百多个字段', '首页字段规模'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (s.failTypes !== 4) throw new Error('入组失败类型数异常: ' + s.failTypes);
  if (s.crit !== 3) throw new Error('主诊断判据数异常: ' + s.crit);
  if (p.purposes !== 5) throw new Error('首页用途数异常: ' + p.purposes);
  if (Math.round(c.mergedLowYuan) !== 3600 || Math.round(c.mergedHighYuan) !== 6000) {
    throw new Error(`合并症金额区间复算异常: ${c.mergedLowYuan}–${c.mergedHighYuan}`);
  }
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
  console.log(`抽 ${p.sampled} 份、${p.errors} 份存在四类错误之一 → 抽样错误率 ${c.ratePct}%`);
  console.log(`年出院 ${p.discharges.toLocaleString('en-US')} 例 × ${c.ratePct}% → 全年约 ${c.bad} 份首页带错`);
  console.log(`每份偏差 ${p.weight} 个权重 × 每权重 ${p.price} 万元 → 年结算偏差 ${c.dev.toFixed(1)} 万元（正文取 ${c.devInt}）`);
  console.log(`合并症权重差 ${p.mergedLow}–${p.mergedHigh} → 每例 ${Math.round(c.mergedLowYuan)} 到 ${Math.round(c.mergedHighYuan)} 元`);
  console.log('');
  console.log(`结构清点：首页 ${p.purposes} 种用途 · 主诊断 ${s.crit} 条判据 · 入组失败 ${s.failTypes} 类（${s.failNames.join('、')}）`);
  console.log(`同一术式两台结算差 ${p.gapYuan.toLocaleString('en-US')} 元 = 两行字的价`);
  console.log('');
  console.log('※ 偏差量级的作用不是精确，而是说明编码质量直接写在财务账上。');
  console.log('※ 本输出仅用于教学演示，不构成编码指导、结算意见或法律意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify };
