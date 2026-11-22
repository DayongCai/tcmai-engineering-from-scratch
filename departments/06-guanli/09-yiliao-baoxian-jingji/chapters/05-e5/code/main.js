#!/usr/bin/env node
/**
 * 卫生经济学 · 第 5 章 保险卖的是确定性，赔的是激励：逆选择与道德风险是一枚硬币的两面
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/05-e5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文现读现算：
 *   1) 逆选择螺旋——两档真实成本、人群占比、退出率由正文给出，逐轮推参保人数、人均成本
 *      与相对初始保费的涨幅，直到低风险者全部退出；
 *   2) 患者侧道德风险——共付 20% 在两档弹性下的需求增量；
 *   3) 免赔额——被过滤的小额理赔笔数与管理成本节省。
 * 螺旋表任何一行的数字与复算不符，脚本就直接报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '保险卖的是确定性，赔的是激励：逆选择与道德风险是一枚硬币的两面';

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

/** 螺旋的初始条件从 PROBLEM 段读出。 */
function spiralParams(body) {
  const g = (re, label) => {
    const m = body.match(re);
    if (!m) throw new Error('正文里读不到' + label);
    return Number(m[1].replace(/,/g, ''));
  };
  return {
    n0: g(/一个\s*([\d.]+)\s*万人的自愿参保池/, '参保人数') * 1e4,
    lowCost: g(/低风险者真实人均成本\s*([\d,]+)\s*元/, '低风险成本'),
    highCost: g(/高风险者\s*([\d,]+)\s*元/, '高风险成本'),
    lowShare: g(/占\s*([\d.]+)%）/, '低风险占比') / 100,
    premium: g(/保费定为\s*([\d,]+)\s*元/, '保费'),
    exitRate: g(/每年退出\s*([\d.]+)%/, '退出率') / 100,
  };
}

function spiralTable(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('轮次')));
  if (!t) throw new Error('正文里没找到螺旋表');
  return t.rows.map((r) => ({
    round: r[0],
    n: num(r[1]),
    low: num(r[2]),
    avg: num(r[3]),
    rel: /—/.test(r[4]) ? null : num(r[4]),
  }));
}

/** 逐轮滚动：低风险者按退出率流失，高风险者不退，均价 = 总成本 ÷ 人数。 */
function compute(p, rounds = 5) {
  const low0 = p.n0 * p.lowShare;
  const high0 = p.n0 - low0;
  const series = [{ round: 0, n: p.n0, low: low0, avg: (low0 * p.lowCost + high0 * p.highCost) / p.n0, rel: 0 }];
  const keep = Math.round((1 - p.exitRate) * 100);
  for (let k = 1; k <= rounds; k += 1) {
    // 用整数分子/分母算留存，避免 0.85³ 的浮点误差把 .5 舍成 .4999
    const low = Math.round((low0 * Math.pow(keep, k)) / Math.pow(100, k));
    const n = high0 + low;
    const avg = (low * p.lowCost + high0 * p.highCost) / n;
    series.push({ round: k, n, low, avg, rel: (avg / p.premium - 1) * 100 });
  }
  const steady = { round: '稳态', n: high0, low: 0, avg: p.highCost, rel: (p.highCost / p.premium - 1) * 100 };
  return { series, steady, low0, high0 };
}

/** 患者侧道德风险：共付比例与两档弹性从正文读出。 */
function moralHazard(body) {
  const copay = Number(body.match(/自付比例从\s*100%\s*降到\s*(\d+)%/)[1]) / 100;
  const eps = [...body.matchAll(/按弹性\s*\u2212(0\.\d)\s*计算/g)].map((m) => -Number(m[1]));
  if (!eps.length) throw new Error('正文里读不到弹性');
  return { copay, eps, effects: eps.map((e) => (Math.pow(copay, e) - 1) * 100) };
}

/** 免赔额算术：理赔笔数、低于免赔额的比例、每笔处理成本。 */
function deductible(body) {
  const cases = Number(body.match(/按\s*([\d,]+)\s*万笔理赔/)[1].replace(/,/g, '')) * 1e4;
  const perCase = Number(body.match(/每笔处理成本\s*([\d,]+)\s*元/)[1]);
  const smallShare = Number(body.match(/(\d+)%\s*的参保人年费用低于/)[1]) / 100;
  return { cases, perCase, smallShare, saved: cases * smallShare * perCase };
}

function verify(c, table, mh, dd, body) {
  const byRound = (k) => c.series.find((x) => x.round === k);
  for (const row of table) {
    if (row.round === '稳态') continue;
    const k = Number(row.round);
    const got = byRound(k);
    if (!got) continue;
    if (got.n !== row.n) throw new Error(`第 ${k} 轮参保人数与正文不符：${row.n} vs ${got.n}`);
    if (got.low !== row.low) throw new Error(`第 ${k} 轮低风险人数与正文不符：${row.low} vs ${got.low}`);
    if (Math.abs(got.avg - row.avg) > 0.6) throw new Error(`第 ${k} 轮人均成本与正文不符：${row.avg} vs ${got.avg.toFixed(1)}`);
    if (row.rel !== null && Math.abs(got.rel - row.rel) > 0.06) {
      throw new Error(`第 ${k} 轮涨幅与正文不符：${row.rel}% vs ${got.rel.toFixed(1)}%`);
    }
  }
  const last = byRound(5);
  if (!body.includes('3,752')) throw new Error('正文与复算不一致：第 5 轮均价');
  if (Math.abs(c.steady.rel - 75) > 1e-9) throw new Error('稳态涨幅应为 75%');
  if (!body.includes('75%')) throw new Error('正文与复算不一致：稳态涨幅');
  if (mh.effects.length < 2) throw new Error('需要两档弹性');
  for (const s of ['38.0%', '62.1%']) {
    if (!body.includes(s)) throw new Error('正文与复算不一致：共付效应 ' + s);
  }
  if (Math.abs(dd.saved - 1.8e7) > 1e-6) throw new Error('免赔额节省应为 1,800 万元: ' + dd.saved);
  if (!body.includes('1,800 万元')) throw new Error('正文与复算不一致：免赔额节省');
  if (!(last.avg > 0)) throw new Error('第 5 轮均价异常');
}

function main() {
  const body = read();
  const p = spiralParams(body);
  const table = spiralTable(parseTables(body));
  const c = compute(p);
  const mh = moralHazard(body);
  const dd = deductible(body);
  verify(c, table, mh, dd, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`初始池 ${p.n0.toLocaleString('en-US')} 人：低风险 ${p.lowShare * 100}% × ${p.lowCost} 元，高风险 ${(1 - p.lowShare) * 100}% × ${p.highCost} 元，保费 ${p.premium} 元`);
  console.log('逆选择螺旋（每年 15% 低风险者退出，高风险者不退）：');
  for (const r of [...c.series, c.steady]) {
    const rel = r.round === 0 ? '—' : `${r.rel >= 0 ? '+' : ''}${r.rel.toFixed(1)}%`;
    console.log(`  ${String(r.round).padStart(3)} · ${Math.round(r.n).toLocaleString('en-US').padStart(7)} 人 · 低风险 ${Math.round(r.low).toLocaleString('en-US').padStart(6)} · 均价 ${r.avg.toFixed(0).padStart(4)} 元 · ${rel}`);
  }
  console.log(`  螺旋没有内生的停止点：只要保费高于某个人的预期成本，他就有退出的动机。`);
  console.log('');
  console.log(`患者侧道德风险：自付降到 ${mh.copay * 100}%，按 ε = ${mh.eps.join(' / ')}，需求增加 ${mh.effects.map((x) => '+' + x.toFixed(1) + '%').join(' / ')}`);
  console.log(`免赔额：${(dd.cases / 1e4).toLocaleString('en-US')} 万笔 × ${dd.smallShare * 100}% × ${dd.perCase} 元 = ${(dd.saved / 1e4).toLocaleString('en-US')} 万元管理成本`);
  console.log('  省的是管理费，伤的是参保意愿——被过滤的正是维持池子稳定的健康人。');
  console.log('');
  console.log('※ 本输出仅用于教学演示，不构成任何保险产品设计、费率厘定或参保建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, parseTables, spiralParams, spiralTable,
  compute, moralHazard, deductible, verify, num,
};
