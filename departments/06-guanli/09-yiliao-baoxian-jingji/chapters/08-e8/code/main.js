#!/usr/bin/env node
/**
 * 卫生经济学 · 第 8 章 控费的最后一步不是省钱，是把钱从低价值处搬到高价值处
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/08-e8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文现读现算：
 *   1) 基金滚动——收入、支出、累计结余与两个增速由正文给出，逐年滚出缺口与余额，
 *      与「静态可支撑 5 年」的算法对照；
 *   2) 智能审核——命中率、追回率与支出基数，算出追回额与占支出比；
 *   3) 多层次保障——三层报销逐层扣减，看累计报销率；
 *   4) 中医支付——骨折两种治法在按项目与打包下的损益，以及三证型按均值打包的结余。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '控费的最后一步不是省钱，是把钱从低价值处搬到高价值处';

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

/** PROBLEM 段：当年收支、累计结余、两个增速。 */
function fundParams(body) {
  const g = (re, label) => {
    const m = body.match(re);
    if (!m) throw new Error('正文里读不到' + label);
    return Number(m[1].replace(/,/g, ''));
  };
  return {
    income: g(/当年收入\s*([\d,]+)\s*亿元/, '当年收入'),
    spend: g(/支出\s*([\d,]+)\s*亿元/, '当年支出'),
    reserve: g(/累计结余\s*([\d,]+)\s*亿元/, '累计结余'),
    spendGrowth: g(/支出年增\s*(\d+)%/, '支出增速') / 100,
    incomeGrowth: g(/收入年增\s*(\d+)%/, '收入增速') / 100,
  };
}

function rollTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('当年缺口')));
  if (!t) throw new Error('正文里没找到基金滚动表');
  return t.rows.map((r) => ({
    year: Number(r[0]),
    spend: num(r[1]),
    income: num(r[2]),
    gap: num(r[3]),
    cumGap: num(r[4]),
    balance: num(r[5]),
  }));
}

/** 智能审核：审核规则命中支出占比、命中金额追回率。 */
function auditParams(body) {
  const m = body.match(/审核规则命中支出占比\s*([\d.]+)%，命中金额的追回率\s*([\d.]+)%/);
  if (!m) throw new Error('正文里读不到审核命中率与追回率');
  return { hit: Number(m[1]) / 100, recover: Number(m[2]) / 100 };
}

/** 多层次：政策范围内费用与三层报销比例。 */
function layers(body) {
  const total = num(body.match(/政策范围内费用\s*([\d,]+)\s*元/)[1]);
  const basic = Number(body.match(/基本医保\s*\|\s*政策内报销\s*(\d+)%/)[1]) / 100;
  const major = Number(body.match(/大病保险\s*\|\s*对自付部分再报\s*(\d+)%/)[1]) / 100;
  const aid = Number(body.match(/医疗救助\s*\|\s*对剩余自付再报\s*(\d+)%/)[1]) / 100;
  return { total, rates: [basic, major, aid] };
}

function compute(p, a, l) {
  const rows = [];
  let cumGap = 0;
  for (let t = 0; t <= 5; t += 1) {
    const spend = p.spend * Math.pow(1 + p.spendGrowth, t);
    const income = p.income * Math.pow(1 + p.incomeGrowth, t);
    const gap = spend - income;
    cumGap += gap;
    rows.push({ year: t, spend, income, gap, cumGap, balance: p.reserve - cumGap });
  }
  const staticYears = p.reserve / (p.spend - p.income);
  const recover = p.spend * a.hit * a.recover;
  let remaining = l.total;
  const paid = l.rates.map((r) => {
    const out = remaining * r;
    remaining -= out;
    return out;
  });
  const cumRate = [];
  let acc = 0;
  for (const x of paid) { acc += x; cumRate.push((acc / l.total) * 100); }
  return { rows, staticYears, recover, recoverShare: (recover / p.spend) * 100, paid, cumRate, finalSelf: remaining };
}

function verify(p, r, c, body) {
  if (Math.abs(c.staticYears - 5) > 1e-9) throw new Error('静态可支撑年限应为 5: ' + c.staticYears);
  if (!body.includes('可支撑 5 年')) throw new Error('正文与复算不一致：静态年限');
  for (const row of r) {
    const got = c.rows.find((x) => x.year === row.year);
    if (!got) continue;
    if (Math.abs(got.spend - row.spend) > 0.15) throw new Error(`第 ${row.year} 年支出不符：${row.spend} vs ${got.spend.toFixed(1)}`);
    if (Math.abs(got.income - row.income) > 0.15) throw new Error(`第 ${row.year} 年收入不符：${row.income} vs ${got.income.toFixed(1)}`);
    if (Math.abs(got.gap - row.gap) > 0.15) throw new Error(`第 ${row.year} 年缺口不符：${row.gap} vs ${got.gap.toFixed(1)}`);
    if (Math.abs(got.balance - row.balance) > 0.15) throw new Error(`第 ${row.year} 年余额不符：${row.balance} vs ${got.balance.toFixed(1)}`);
  }
  const y3 = c.rows.find((x) => x.year === 3);
  const y2 = c.rows.find((x) => x.year === 2);
  if (!(y2.balance > 0 && y3.balance < 0)) throw new Error('第 3 年内应转负');
  if (!body.includes('第 3 年内')) throw new Error('正文与复算不一致：转折年份');
  if (Math.abs(c.rows[5].cumGap - 974.2) > 0.2) throw new Error('第 5 年累计缺口应为 974 亿: ' + c.rows[5].cumGap);
  if (Math.abs(c.rows[5].cumGap / p.reserve - 3.2) > 0.05) throw new Error('累计缺口应为初始结余的 3.2 倍');
  if (Math.abs(c.recover - 12.72) > 0.01) throw new Error('追回额应为 12.72 亿: ' + c.recover);
  if (!body.includes('12.72 亿元')) throw new Error('正文与复算不一致：审核追回额');
  if (Math.abs(c.recoverShare - 1.2) > 0.05) throw new Error('追回额占支出应为 1.2%: ' + c.recoverShare);
  const wantCum = [70, 88, 94];
  c.cumRate.forEach((x, i) => {
    if (Math.abs(x - wantCum[i]) > 0.6) throw new Error(`第 ${i + 1} 层累计报销应为 ${wantCum[i]}%: ${x.toFixed(1)}%`);
  });
  if (Math.abs(c.paid[1] - 1800) > 1e-6 || Math.abs(c.paid[2] - 600) > 1e-6) throw new Error('分层支付额不符');
  if (!body.includes('1,800') || !body.includes('7,000')) throw new Error('正文与复算不一致：分层案例');
}

function main() {
  const body = read();
  const tables = parseTables(body);
  const p = fundParams(body);
  const r = rollTable(tables);
  const a = auditParams(body);
  const l = layers(body);
  const c = compute(p, a, l);
  verify(p, r, c, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`当年收入 ${p.income} 亿、支出 ${p.spend} 亿、累计结余 ${p.reserve} 亿`);
  console.log(`  静态算法：${p.reserve} ÷ ${(p.spend - p.income).toFixed(0)} = 可支撑 ${c.staticYears} 年`);
  console.log(`  滚动算法（支出 +${p.spendGrowth * 100}%、收入 +${p.incomeGrowth * 100}%）：`);
  for (const x of c.rows) {
    console.log(`    第 ${x.year} 年 · 支出 ${x.spend.toFixed(1)} · 收入 ${x.income.toFixed(1)} · 缺口 ${x.gap.toFixed(1)} · 余额 ${x.balance.toFixed(1)}`);
  }
  console.log(`  第 3 年内转负；第 5 年累计缺口 ${c.rows[5].cumGap.toFixed(1)} 亿，是初始结余的 ${(c.rows[5].cumGap / p.reserve).toFixed(1)} 倍。`);
  console.log('');
  console.log(`智能审核：${p.spend} × ${(a.hit * 100).toFixed(0)}% × ${(a.recover * 100).toFixed(0)}% = ${c.recover.toFixed(2)} 亿元，占支出 ${c.recoverShare.toFixed(1)}%`);
  console.log('  它优化的是可检测性，不是价值：真正无效但编码规范的诊疗，审核系统看不见。');
  console.log('');
  console.log(`多层次保障（政策范围内 ${l.total.toLocaleString('en-US')} 元）：`);
  c.paid.forEach((x, i) => {
    console.log(`  第 ${i + 1} 层支付 ${x.toFixed(0)} 元 · 累计报销 ${c.cumRate[i].toFixed(0)}%`);
  });
  console.log(`  个人自付 ${c.finalSelf.toFixed(0)} 元 —— 分层覆盖不同费用段，不是层层叠加同一段。`);
  console.log('');
  console.log('※ 结余不是成绩：靠推诿与延迟服务换来的结余，会以再入院率与并发症率回来。');
  console.log('※ 本输出仅用于教学演示，不构成对任何地区医保政策、支付标准或考核指标的建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, parseTables, fundParams, rollTable, auditParams, layers, compute, verify, num,
};
