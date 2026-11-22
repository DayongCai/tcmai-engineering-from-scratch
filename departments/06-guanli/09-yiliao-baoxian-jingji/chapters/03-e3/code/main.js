#!/usr/bin/env node
/**
 * 卫生经济学 · 第 3 章 市场能给服务定价，但不能替社会决定谁先得到
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/03-e3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两处算术都从正文现读现算：
 *   1) 价格管制——真实成本、管制价格、供给弹性推出供给收缩，再加上等候时间成本，
 *      得到「名义价格 10 元、实际支付 34 元」这条链；
 *   2) 举办与购买——成本构成表逐项相加，与按人头购买的单价乘人数对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '市场能给服务定价，但不能替社会决定谁先得到';

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
const signed = (s) => num(String(s).replace(/\u2212/g, '-'));
const wan = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' 万';

/** 价格管制的四个参数从 PROBLEM 段读出。 */
function priceParams(body) {
  const one = (re, label) => {
    const m = body.match(re);
    if (!m) throw new Error('正文里读不到' + label);
    return Number(m[1].replace(/,/g, ''));
  };
  return {
    cost: one(/真实成本\s*([\d,]+)\s*元/, '真实成本'),
    fee: one(/挂号费被管制在\s*([\d,]+)\s*元/, '管制价格'),
    elasticity: one(/供给按弹性\s*([\d.]+)/, '供给弹性'),
    waitMin: one(/平均等候\s*([\d,]+)\s*分钟/, '等候时间'),
    timeCost: one(/每小时\s*([\d,]+)\s*元/, '时间成本'),
  };
}

/** 「方案／年成本构成／合计」表：举办一侧的三项相加，购买一侧按单价乘人数。 */
function purchaseTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('年成本构成')));
  if (!t) throw new Error('正文里没找到举办与购买对照表');
  const gov = t.rows.find((r) => /政府举办/.test(r[0]));
  const buy = t.rows.find((r) => /购买服务/.test(r[0]));
  const parts = (gov[1].match(/([\d,.]+)\s*万/g) || []).map((s) => num(s));
  const perHead = num(buy[1].match(/([\d.]+)\s*元\/人/)[1]);
  const people = num(buy[1].match(/×\s*([\d.]+)\s*万人/)[1]);
  return { govParts: parts, govTotal: num(gov[2]), perHead, people, buyTotal: num(buy[2]) };
}

function compute(p, t) {
  const supplyChange = (p.elasticity * (p.fee - p.cost)) / p.cost * 100;
  const waitCost = (p.waitMin / 60) * p.timeCost;
  const realPay = p.fee + waitCost;
  const overCost = (realPay / p.cost - 1) * 100;
  const govSum = t.govParts.reduce((a, b) => a + b, 0);
  const buySum = t.perHead * t.people;
  return {
    supplyChange, waitCost, realPay, overCost,
    govSum, buySum,
    diff: govSum - buySum,
    diffPct: (buySum / govSum - 1) * 100,
  };
}

function verify(c, body) {
  if (Math.abs(c.supplyChange + 22.2) > 0.05) throw new Error('供给收缩应为 −22.2%: ' + c.supplyChange);
  if (!body.includes('−22.2%')) throw new Error('正文与复算不一致：供给收缩');
  if (Math.abs(c.realPay - 34) > 1e-9) throw new Error('实际支付应为 34 元: ' + c.realPay);
  if (Math.abs(c.overCost - 88.9) > 0.1) throw new Error('高于成本应为 88.9%: ' + c.overCost);
  if (!body.includes('34 元')) throw new Error('正文与复算不一致：实际支付');
  if (Math.abs(c.govSum - 600) > 1e-6) throw new Error('举办合计应为 600 万: ' + c.govSum);
  if (Math.abs(c.buySum - 440) > 1e-6) throw new Error('购买合计应为 440 万: ' + c.buySum);
  if (Math.abs(c.diff - 160) > 1e-6) throw new Error('差额应为 160 万: ' + c.diff);
  if (Math.abs(c.diffPct + 26.7) > 0.05) throw new Error('差额比例应为 −26.7%: ' + c.diffPct);
  for (const s of ['600 万', '440 万', '160 万', '26.7%']) {
    if (!body.includes(s)) throw new Error('正文与复算不一致: ' + s);
  }
}

function main() {
  const body = read();
  const p = priceParams(body);
  const t = purchaseTable(parseTables(body));
  const c = compute(p, t);
  verify(c, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`成本 ${p.cost} 元、管制价格 ${p.fee} 元、供给弹性 ${p.elasticity}`);
  console.log(`  供给收缩 ${p.elasticity} × (${p.fee} − ${p.cost}) ÷ ${p.cost} = ${c.supplyChange.toFixed(1)}%`);
  console.log(`  缺口变成排队：${p.waitMin} 分钟 × ${p.timeCost} 元/小时 ÷ 60 = ${c.waitCost.toFixed(0)} 元`);
  console.log(`  名义价格 ${p.fee} 元，实际支付 ${c.realPay.toFixed(0)} 元，比成本高 ${c.overCost.toFixed(0)}%`);
  console.log('');
  console.log('举办与购买：');
  console.log(`  举办合计 ${wan(c.govSum)}（${t.govParts.join(' + ')}）`);
  console.log(`  购买合计 ${t.perHead} 元/人 × ${t.people} 万人 = ${wan(c.buySum)}`);
  console.log(`  差额 ${wan(c.diff)}（${c.diffPct.toFixed(1)}%）`);
  console.log('  这 26.7% 不能直接用：可及性、连续性、兜底义务三项留在了账外。');
  console.log('');
  console.log('※ 价格管制没有让看病变便宜，只把货币价格换成了时间价格，并且让最没有议价能力的人多付。');
  console.log('※ 本输出仅用于教学演示，不构成对任何现行价格、采购或监管制度的评价意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, priceParams, purchaseTable, compute, verify, num, signed };
