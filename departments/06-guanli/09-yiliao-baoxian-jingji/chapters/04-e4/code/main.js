#!/usr/bin/env node
/**
 * 卫生经济学 · 第 4 章 钱从哪里来，决定谁能用：筹资结构比筹资总量更能解释可及性
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/04-e4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文现读现算：
 *   1) 风险池——人均费用与个体支出标准差由正文给出，逐行复算总支出、总支出标准差、
 *      相对波动与 95% 上限所需安全垫；
 *   2) 碎片化——十个万人池与一个十万人池的准备金率对照；
 *   3) 三个核算口径的极差与自付下降的边际收益。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '钱从哪里来，决定谁能用：筹资结构比筹资总量更能解释可及性';

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

/** 「3,000 万」「30 亿」→ 元。 */
function money(s) {
  const v = num(s);
  if (/亿/.test(s)) return v * 1e8;
  if (/万/.test(s)) return v * 1e4;
  return v;
}

/** 人数行「1 万」「100 万」→ 人。 */
const people = (s) => (/万/.test(s) ? num(s) * 1e4 : num(s));

function poolParams(body) {
  const m1 = body.match(/人均年费用\s*([\d,]+)\s*元/);
  const m2 = body.match(/标准差\s*([\d,]+)\s*元/);
  if (!m1 || !m2) throw new Error('正文里读不到人均费用或标准差');
  return { mean: Number(m1[1].replace(/,/g, '')), sd: Number(m2[1].replace(/,/g, '')) };
}

function poolTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('参保人数')));
  if (!t) throw new Error('正文里没找到风险池对照表');
  return t.rows.map((r) => ({
    n: people(r[0]),
    totalStated: money(r[1]),
    sdStated: money(r[2]),
    relStated: num(r[3]),
    padStated: num(r[4]),
  }));
}

function compute(p, rows) {
  const out = rows.map((r) => {
    const total = p.mean * r.n;
    const sdTotal = p.sd * Math.sqrt(r.n);
    const rel = (sdTotal / total) * 100;
    const pad = 1.645 * rel;
    return { n: r.n, total, sdTotal, rel, pad };
  });
  const single = out.find((x) => x.n === 1e5) || {
    n: 1e5,
    total: p.mean * 1e5,
    sdTotal: p.sd * Math.sqrt(1e5),
  };
  const padTen = (1.645 * single.sdTotal) / single.total * 100;
  return { rows: out, bigPoolPad: padTen };
}

/** 三个口径的极差：来源法、机构法、功能法三个数从正文读出。 */
function caliberSpread(body) {
  const m = body.match(/来源法\s*([\d,]+)\s*亿、机构法\s*([\d,]+)\s*亿、功能法\s*([\d,]+)\s*亿/);
  if (!m) throw new Error('正文里读不到三个核算口径的数值');
  const v = m.slice(1, 4).map((s) => Number(s.replace(/,/g, '')));
  const max = Math.max(...v);
  const min = Math.min(...v);
  return { values: v, spread: max - min, spreadPct: ((max - min) / min) * 100 };
}

function verify(c, spread, body) {
  for (const r of c.rows) {
    const got = c.rows.find((x) => x.n === r.n);
    if (!got) throw new Error('人数解析失败');
    if (Math.abs(got.rel - r.relStated) > 0.01) throw new Error(`相对波动与正文不符（n=${r.n}）：${r.relStated}% vs ${got.rel.toFixed(2)}%`);
    if (Math.abs(got.pad - r.padStated) > 0.01) throw new Error(`安全垫与正文不符（n=${r.n}）：${r.padStated}% vs ${got.pad.toFixed(2)}%`);
  }
  if (!body.includes('4.39%') || !body.includes('0.44%')) throw new Error('正文与复算不一致：安全垫');
  if (Math.abs(c.bigPoolPad - 1.39) > 0.01) throw new Error('十万人池的安全垫应为 1.39%: ' + c.bigPoolPad);
  if (!body.includes('1.39%')) throw new Error('正文与复算不一致：十万人池安全垫');
  if (Math.abs(spread.spread - 7) > 1e-9) throw new Error('口径极差应为 7 亿: ' + spread.spread);
  if (Math.abs(spread.spreadPct - 7.29) > 0.05) throw new Error('口径极差比例应为约 7%: ' + spread.spreadPct);
  if (!body.includes('7%')) throw new Error('正文与复算不一致：口径极差');
}

function main() {
  const body = read();
  const tables = parseTables(body);
  const p = poolParams(body);
  const rows = poolTable(tables);
  const c = compute(p, rows);
  const spread = caliberSpread(body);
  verify(c, spread, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`人均年费用 ${p.mean} 元，个体支出标准差 ${p.sd} 元（高度右偏，少数人花费极高）`);
  console.log('风险池复算（总支出标准差 = σ√n，安全垫 = 1.645σ√n ÷ 总支出）：');
  for (const r of c.rows) {
    console.log(`  ${String(r.n / 1e4).padStart(5)} 万人 · 总支出 ${(r.total / 1e8).toFixed(2)} 亿 · 标准差 ${(r.sdTotal / 1e4).toFixed(0)} 万 · 相对波动 ${r.rel.toFixed(2)}% · 安全垫 ${r.pad.toFixed(2)}%`);
  }
  console.log(`  十个万人池的准备金率各要 4.39%，一个十万人池只要 ${c.bigPoolPad.toFixed(2)}% —— 碎片化不省风险，只多花钱。`);
  console.log('');
  console.log(`三个核算口径：${spread.values.join(' / ')} 亿元，极差 ${spread.spread} 亿元（${spread.spreadPct.toFixed(1)}%）`);
  console.log('  差额不是误差，是信息：来源法高意味着资金沉淀在机构，功能法高意味着部分支出在统计范围外。');
  console.log('');
  console.log('※ 池子小十倍，安全垫要厚十倍——这不是管理能力问题，是方差问题。');
  console.log('※ 本输出仅用于教学演示，不构成对任何地区筹资政策、费率或待遇水平的建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, poolParams, poolTable, compute, caliberSpread, verify, num, money };
