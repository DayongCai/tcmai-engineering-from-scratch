#!/usr/bin/env node
/**
 * 卫生经济学 · 第 7 章 「值不值」是一个比值加一个预算：成本效果再好，也可能买不起
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/07-e7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文现读现算：
 *   1) ICER 与阈值——两方案的成本与 QALY 由正文给出，算出增量比，再反解临界 ΔE；
 *   2) 敏感性表逐行复算，验证「ΔE 掉到 0.017 以下结论就翻转」；
 *   3) 预算影响——适用人群 × 人均增量成本，按渗透率再算一遍；
 *   4) 贴现与降价——3% 十年折现因子，以及降价后 ICER 与年支出同步变化；
 *   5) 中医缺口——证候积分映射到 QALY 后得到的比值。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '「值不值」是一个比值加一个预算：成本效果再好，也可能买不起';

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

const num = (s) => {
  const t = String(s).replace(/,/g, '').replace(/\u2212/g, '-');
  const m = t.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
const wan = (n) => n * 1e4;

/** 两方案的成本与效果，以及人均 GDP 与阈值倍数。 */
function baseParams(body) {
  const g = (re, label) => {
    const m = body.match(re);
    if (!m) throw new Error('正文里读不到' + label);
    return m;
  };
  const nw = g(/新方案人均\s*([\d,]+)\s*元、效果\s*([\d.]+)\s*QALY/, '新方案');
  const ct = g(/对照方案人均\s*([\d,]+)\s*元、效果\s*([\d.]+)\s*QALY/, '对照方案');
  const gdp = g(/人均 GDP\s*([\d,]+)\s*万元/, '人均 GDP');
  const mult = g(/阈值取人均 GDP 的\s*(\d+)\s*倍/, '阈值倍数');
  const pop = g(/适用人群\s*([\d,]+)\s*万人/, '适用人群');
  return {
    newCost: num(nw[1]), newEff: Number(nw[2]),
    oldCost: num(ct[1]), oldEff: Number(ct[2]),
    gdp: wan(num(gdp[1])),
    multiple: Number(mult[1]),
    pop: wan(num(pop[1])),
  };
}

/** 敏感性表：ΔE 与 ICER。 */
function sensitivity(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('增量效果')));
  if (!t) throw new Error('正文里没找到敏感性表');
  return t.rows.map((r) => ({ dE: num(r[0]), icer: num(r[1]) }));
}

/** 中医缺口：证候积分差值、映射 QALY、增量成本。 */
function tcmGap(body) {
  const m = body.match(/证候积分改善\s*([\d.]+)\s*分\s*vs\s*对照\s*([\d.]+)\s*分/);
  const q = body.match(/得到\s*([\d.]+)\s*QALY\s*的增量，而人均增量成本\s*([\d,]+)\s*元/);
  if (!m || !q) throw new Error('正文里读不到证候积分与映射 QALY');
  return { diff: Number(m[1]) - Number(m[2]), qaly: Number(q[1]), cost: num(q[2]) };
}

function compute(p, sens) {
  const dC = p.newCost - p.oldCost;
  const dE = p.newEff - p.oldEff;
  const icer = dC / dE;
  const threshold = p.gdp * p.multiple;
  const critical = dC / threshold;
  return {
    dC, dE, icer, threshold, critical,
    budget: p.pop * dC,
    budget30: p.pop * 0.3 * dC,
    discount: 1 / Math.pow(1.03, 10),
    sens: sens.map((r) => ({ ...r, calc: dC / r.dE })),
    priceCut: { cost: p.newCost - 2000, icer: (p.newCost - 2000 - p.oldCost) / dE, budget: p.pop * (p.newCost - 2000 - p.oldCost) },
  };
}

function verify(p, c, sens, tcm, body) {
  if (Math.abs(c.icer - 33333.33) > 0.5) throw new Error('ICER 应为 33,333: ' + c.icer);
  if (c.threshold !== 240000) throw new Error('阈值应为 24 万: ' + c.threshold);
  if (!body.includes('33,333 元/QALY')) throw new Error('正文与复算不一致：ICER');
  if (Math.abs(c.critical - 0.016667) > 1e-6) throw new Error('临界 ΔE 应为 0.0167: ' + c.critical);
  if (!body.includes('0.0167')) throw new Error('正文与复算不一致：临界 ΔE');
  if (c.budget !== 4e8) throw new Error('年增量支出应为 4 亿元: ' + c.budget);
  if (c.budget30 !== 1.2e8) throw new Error('渗透 30% 后应为 1.2 亿元: ' + c.budget30);
  if (!body.includes('4 亿元') || !body.includes('1.2 亿元')) throw new Error('正文与复算不一致：预算影响');
  for (const row of c.sens) {
    if (!Number.isFinite(row.dE) || !Number.isFinite(row.calc)) {
      throw new Error('敏感性表有一行解析失败：ΔE=' + row.dE);
    }
    if (Math.abs(row.calc - row.icer) > row.icer * 0.001 + 0.5) {
      throw new Error(`敏感性表 ΔE=${row.dE} 与复算不符：${row.icer} vs ${row.calc.toFixed(0)}`);
    }
  }
  if (Math.abs(c.discount - 0.744) > 0.001) throw new Error('3% 十年折现因子应为 0.744: ' + c.discount);
  if (!body.includes('0.744 元')) throw new Error('正文与复算不一致：折现因子');
  if (Math.abs(c.priceCut.icer - 16666.67) > 0.5) throw new Error('降价后 ICER 应为 16,667: ' + c.priceCut.icer);
  if (c.priceCut.budget !== 2e8) throw new Error('降价后年支出应为 2 亿元: ' + c.priceCut.budget);
  if (!body.includes('16,667')) throw new Error('正文与复算不一致：降价后 ICER');
  if (Math.abs(tcm.diff - 0.7) > 1e-9) throw new Error('证候积分差值应为 0.7: ' + tcm.diff);
  if (Math.abs(tcm.cost / tcm.qaly - 30000) > 0.5) throw new Error('映射后 ICER 应为 30,000: ' + tcm.cost / tcm.qaly);
  if (!body.includes('30,000 元/QALY')) throw new Error('正文与复算不一致：映射后 ICER');
  if (!(c.budget > c.threshold / 6)) throw new Error('预算影响应足以花穿基金');
}

function main() {
  const body = read();
  const p = baseParams(body);
  const sens = sensitivity(parseTables(body));
  const tcm = tcmGap(body);
  const c = compute(p, sens);
  verify(p, c, sens, tcm, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`新方案 ${p.newCost.toLocaleString('en-US')} 元 / ${p.newEff} QALY；对照 ${p.oldCost.toLocaleString('en-US')} 元 / ${p.oldEff} QALY`);
  console.log(`  ΔC = ${c.dC.toLocaleString('en-US')} 元，ΔE = ${c.dE.toFixed(2)} QALY，ICER = ${c.icer.toFixed(0)} 元/QALY`);
  console.log(`  阈值 = ${p.multiple} × 人均 GDP ${(p.gdp / 1e4).toFixed(0)} 万 = ${(c.threshold / 1e4).toFixed(0)} 万元/QALY → 比值只有阈值的 1/${(c.threshold / c.icer).toFixed(0)}`);
  console.log('');
  console.log(`预算影响：${(p.pop / 1e4).toFixed(0)} 万人 × ${c.dC.toLocaleString('en-US')} 元 = ${(c.budget / 1e8).toFixed(0)} 亿元/年`);
  console.log(`  三年渗透 30% 后仍有 ${(c.budget30 / 1e8).toFixed(1)} 亿元/年 —— 一个「极其划算」的技术可以单独把基金花穿`);
  console.log('');
  console.log('敏感性（结论的稳健性取决于 ΔE）：');
  for (const r of c.sens) {
    console.log(`  ΔE = ${String(r.dE).padEnd(7)} → ICER ${r.calc.toFixed(0).padStart(7)} 元/QALY · ${r.calc > c.threshold ? '高于阈值，结论翻转' : '低于阈值'}`);
  }
  console.log(`  临界点 ΔE* = ${c.dC.toLocaleString('en-US')} ÷ ${c.threshold.toLocaleString('en-US')} = ${c.critical.toFixed(4)} QALY（约 6 天完全健康生命）`);
  console.log('');
  console.log(`贴现：3% 十年，1 元折成 ${c.discount.toFixed(3)} 元 —— 收益在远期的预防项目会被系统性压低`);
  console.log(`降价到 ${c.priceCut.cost.toLocaleString('en-US')} 元：ICER ${c.priceCut.icer.toFixed(0)}，年支出 ${(c.priceCut.budget / 1e8).toFixed(0)} 亿元`);
  console.log(`中医缺口：证候积分差 ${tcm.diff.toFixed(1)} 分，映射 ${tcm.qaly} QALY，增量成本 ${tcm.cost.toLocaleString('en-US')} 元 → ICER ${(tcm.cost / tcm.qaly).toFixed(0)} 元/QALY（系数误差可能大于效应本身）`);
  console.log('');
  console.log('※ 成本效果回答值不值，预算影响回答买不买得起，两者都不是对方。');
  console.log('※ 本输出仅用于教学演示，不构成对任何药品、技术或疗法是否纳入报销的建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, parseTables, baseParams, sensitivity, tcmGap, compute, verify, num,
};
