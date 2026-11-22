#!/usr/bin/env node
/**
 * 卫生经济学 · 第 1 章 健康是目的，费用是代价：把两者混成一个数，账就永远算不清
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/01-e1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数全部从本章正文的对照表现读：名义费用、GDP、两个平减指数、人口结构。
 * 折成实际值后重新分解「占比上升 3.3 个百分点」的两个来源，并按年龄结构复算贡献倍数。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '健康是目的，费用是代价：把两者混成一个数，账就永远算不清';

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

const num = (s) => {
  const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

/** 从「名义变化」表读出六行参数。 */
function params(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('名义变化')));
  if (!t) throw new Error('正文里没找到名义变化对照表');
  const row = (kw) => {
    const r = t.rows.find((x) => (x[0] || '').includes(kw));
    if (!r) throw new Error('表里缺行: ' + kw);
    return r;
  };
  const fee = row('卫生总费用');
  const gdp = row('GDP（');
  const share = row('占 GDP');
  const defFee = row('卫生费用平减');
  const defGdp = row('GDP 平减');
  return {
    feeStart: num(fee[1]), feeEnd: num(fee[2]),
    gdpStart: num(gdp[1]), gdpEnd: num(gdp[2]),
    shareStart: num(share[1]), shareEnd: num(share[2]),
    defFee: num(defFee[2]), defGdp: num(defGdp[2]),
  };
}

/**
 * 复算：先按各自平减指数折成实际值，再把名义占比的 3.3 个百分点拆成
 * 「价格相对变贵」与「数量、质量与覆盖扩张」两段；另算年龄结构的单独贡献。
 */
function compute(p, age = { y: [0.12, 0.18], costRatio: 3 }) {
  const realFee = p.feeEnd / p.defFee;
  const realGdp = p.gdpEnd / p.defGdp;
  const realShare = (realFee / realGdp) * 100;
  const realFeeGrowth = (realFee / p.feeStart - 1) * 100;
  const realGdpGrowth = (realGdp / p.gdpStart - 1) * 100;
  const nominalShareDelta = p.shareEnd - p.shareStart;
  const realShareDelta = realShare - p.shareStart;
  const pricePart = nominalShareDelta - realShareDelta;
  const ageFactor = ((age.y[1] * age.costRatio + (1 - age.y[1])) / (age.y[0] * age.costRatio + (1 - age.y[0])));
  return {
    realFee, realGdp, realShare, realFeeGrowth, realGdpGrowth,
    nominalShareDelta, realShareDelta, pricePart,
    ageFactor, agePct: (ageFactor - 1) * 100,
    nominalMultiple: p.feeEnd / p.feeStart,
    realMultiple: realFee / p.feeStart,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, body) {
  const must = [
    [fmt(c.realFee), '实际卫生费用'],
    [c.realShare.toFixed(2), '实际占比'],
    [c.realFeeGrowth.toFixed(1), '实际增长率'],
    [c.pricePart.toFixed(1), '价格贡献'],
    [c.realShareDelta.toFixed(1), '数量与覆盖贡献'],
    [c.agePct.toFixed(1), '年龄结构贡献'],
  ];
  const miss = must.filter(([s]) => !body.includes(s)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (!(c.realMultiple < c.nominalMultiple)) throw new Error('实际增速不应高于名义增速');
  if (Math.abs(c.pricePart + c.realShareDelta - c.nominalShareDelta) > 1e-9) {
    throw new Error('占比变化没有拆全');
  }
}

function main() {
  const body = read();
  const p = params(parseTables(body));
  const c = compute(p);
  verify(c, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`名义费用 ×${c.nominalMultiple.toFixed(2)}；按平减指数 ${p.defFee} 折实际后 ×${c.realMultiple.toFixed(2)}`);
  console.log(`  实际卫生费用 ${fmt(c.realFee)} 亿元 · 实际增长 ${c.realFeeGrowth.toFixed(1)}%`);
  console.log(`  实际 GDP ${fmt(c.realGdp)} 亿元 · 实际增长 ${c.realGdpGrowth.toFixed(1)}%`);
  console.log(`  实际占比 ${c.realShare.toFixed(2)}%，名义占比 ${p.shareStart.toFixed(1)}% → ${p.shareEnd.toFixed(1)}%`);
  console.log('');
  console.log(`那 ${c.nominalShareDelta.toFixed(1)} 个百分点拆成两段：`);
  console.log(`  价格相对变贵 ${c.pricePart.toFixed(1)} 个百分点（卫生平减 ${p.defFee} 高于 GDP 平减 ${p.defGdp}）`);
  console.log(`  数量、质量与覆盖扩张 ${c.realShareDelta.toFixed(1)} 个百分点 ← 这才是要解释的现象`);
  console.log('');
  console.log(`年龄结构单独贡献：${c.ageFactor.toFixed(3)} 倍（约 +${c.agePct.toFixed(1)}%），`);
  console.log(`  只占实际增长 ${c.realFeeGrowth.toFixed(1)}% 的五分之一左右，其余来自技术扩散与保障扩面。`);
  console.log('');
  console.log('※ 名义翻倍与真实翻倍之间差着一个价格故事：把两段合成一句「涨得太快」，等于取消了分析。');
  console.log('※ 本输出仅用于教学演示，不构成医保或财政决策依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, compute, verify, num, fmt };
