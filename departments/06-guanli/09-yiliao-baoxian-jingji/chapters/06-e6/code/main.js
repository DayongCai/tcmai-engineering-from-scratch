#!/usr/bin/env node
/**
 * 卫生经济学 · 第 6 章 价格不是标价，是行为指令：换个支付方式，同一台手术会有两种做法
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/06-e6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文现读现算，四类支付方式各算一遍：
 *   1) 按项目——骨折两种治法的单例损益，换打包支付后技术选择反转；
 *   2) 成本核算——固定成本摊到不同服务量上的单位成本与死亡螺旋；
 *   3) 按病种——不同收治结构下的平均成本与结余（挑选病人的算术）；
 *   4) 按分值——点值随总量浮动，多做不等于多得；
 *   5) 中医打包——三证型按均值打包后的结余，重证型必亏。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '价格不是标价，是行为指令：换个支付方式，同一台手术会有两种做法';

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

function need(body, re, label) {
  const m = body.match(re);
  if (!m) throw new Error('正文里读不到' + label);
  return m;
}

/** 骨折两种治法的收费与成本，以及打包支付标准。 */
function fracture(body) {
  const a = need(body, /手法复位收费\s*([\d,]+)\s*元、成本\s*([\d,]+)\s*元/, '手法复位收费与成本');
  const b = need(body, /切开复位内固定收费\s*([\d,]+)\s*元、成本\s*([\d,]+)\s*元/, '手术收费与成本');
  const bundle = need(body, /打包支付\s*([\d,]+)\s*元/, '打包支付标准');
  return {
    manual: { fee: num(a[1]), cost: num(a[2]) },
    surgery: { fee: num(b[1]), cost: num(b[2]) },
    bundle: num(bundle[1]),
  };
}

/** 成本核算表：年服务量 / 单位固定成本 / 单位总成本 / 单例损益。 */
function costTable(tables, body) {
  const t = tables.find((x) => x.header.some((h) => h.includes('年服务量')));
  if (!t) throw new Error('正文里没找到成本核算表');
  const p = need(body, /年固定成本\s*([\d,]+)\s*万元，每例变动成本\s*([\d,]+)\s*元，价格\s*([\d,]+)\s*元/, '成本核算参数');
  return {
    fixed: Number(p[1].replace(/,/g, '')) * 10000,
    vc: num(p[2]),
    price: num(p[3]),
    rows: t.rows.map((r) => ({
      volume: num(r[0]),
      unitFixedStated: num(r[1]),
      unitTotalStated: num(r[2]),
      profitStated: num(r[3]),
    })),
  };
}

/** 按病种：支付标准、病情成本分布、收治结构。 */
function drg(body) {
  const pay = need(body, /某病种支付\s*([\d,]+)\s*元/, '病种支付标准')[1];
  const d = need(body, /轻症\s*([\d,]+)（(\d+)%）、中症\s*([\d,]+)（(\d+)%）、重症\s*([\d,]+)（(\d+)%）/, '病情成本分布');
  const mix = need(body, /轻症\s*(\d+)%、中症\s*(\d+)%、重症\s*(\d+)/, '调整后收治结构');
  const cases = need(body, /10,000 例合计\s*([\d,]+)\s*万元/, '病例数');
  return {
    pay: num(pay),
    base: [
      { name: '轻症', cost: num(d[1]), share: Number(d[2]) / 100 },
      { name: '中症', cost: num(d[3]), share: Number(d[4]) / 100 },
      { name: '重症', cost: num(d[5]), share: Number(d[6]) / 100 },
    ],
    mix: [Number(mix[1]) / 100, Number(mix[2]) / 100, Number(mix[3]) / 100],
    cases: 10000,
    statedTotal: num(cases[1]) * 1e4,
  };
}

/** 按分值：预算、总分值、做量幅度。 */
function dip(body) {
  const d = need(body, /年度住院预算\s*([\d.,]+)\s*亿元，全年总分值\s*([\d.,]+)\s*万点/, '分值预算');
  const up = need(body, /服务量做高\s*(\d+)%/, '做量幅度');
  return {
    budget: num(d[1]) * 1e8,
    points: num(d[2]) * 1e4,
    up: Number(up[1]) / 100,
  };
}

/** 中医三证型的单次成本。 */
function syndromes(body) {
  const m = need(body, /分别为\s*([\d,]+)\s*元（风寒湿型）、([\d,]+)\s*元（气滞血瘀型）、([\d,]+)\s*元（肝肾亏虚型）/, '证型成本');
  return [
    { name: '风寒湿型', cost: num(m[1]) },
    { name: '气滞血瘀型', cost: num(m[2]) },
    { name: '肝肾亏虚型', cost: num(m[3]) },
  ];
}

function compute(f, ct, d, p, syn) {
  const project = {
    manual: f.manual.fee - f.manual.cost,
    surgery: f.surgery.fee - f.surgery.cost,
  };
  const bundle = {
    manual: f.bundle - f.manual.cost,
    surgery: f.bundle - f.surgery.cost,
  };
  const costs = ct.rows.map((r) => {
    const unitFixed = ct.fixed / r.volume;
    const unitTotal = unitFixed + ct.vc;
    return { volume: r.volume, unitFixed, unitTotal, profit: ct.price - unitTotal };
  });
  const avgOf = (rows) => rows.reduce((s, x) => s + x.cost * x.share, 0);
  const baseAvg = avgOf(d.base);
  const newAvg = d.base.reduce((s, x, i) => s + x.cost * d.mix[i], 0);
  const drgOut = {
    baseAvg,
    baseSurplus: d.pay - baseAvg,
    baseTotal: (d.pay - baseAvg) * d.cases,
    newAvg,
    newSurplus: d.pay - newAvg,
    newTotal: (d.pay - newAvg) * d.cases,
  };
  const point = p.budget / p.points;
  const pointAfter = p.budget / (p.points * (1 + p.up));
  const dipOut = { point, pointAfter, drop: (pointAfter / point - 1) * 100 };
  const mean = syn.reduce((s, x) => s + x.cost, 0) / syn.length;
  const synOut = syn.map((x) => ({ ...x, surplus: mean - x.cost }));
  return { project, bundle, costs, drg: drgOut, dip: dipOut, synMean: mean, synOut };
}

function verify(f, ct, d, p, c, body) {
  if (c.project.manual !== -2200 || c.project.surgery !== 3000) throw new Error('按项目付费的单例损益不符');
  if (c.bundle.manual !== 9000 || c.bundle.surgery !== -3000) throw new Error('打包后的单例结余不符');
  if (!body.includes('亏 2,200') || !body.includes('赚 3,000')) throw new Error('正文与复算不一致：按项目损益');
  if (!body.includes('结余 9,000')) throw new Error('正文与复算不一致：打包后手法复位结余');
  if (!body.includes('手术亏 3,000')) throw new Error('正文与复算不一致：打包后手术亏损');
  for (const row of c.costs) {
    const said = ct.rows.find((x) => x.volume === row.volume);
    if (Math.abs(row.unitFixed - said.unitFixedStated) > 0.06) throw new Error(`单位固定成本不符（${row.volume}）: ${said.unitFixedStated} vs ${row.unitFixed.toFixed(1)}`);
    if (Math.abs(row.unitTotal - said.unitTotalStated) > 0.06) throw new Error(`单位总成本不符（${row.volume}）: ${said.unitTotalStated} vs ${row.unitTotal.toFixed(1)}`);
    if (Math.abs(row.profit - said.profitStated) > 0.06) throw new Error(`单例损益不符（${row.volume}）: ${said.profitStated} vs ${row.profit.toFixed(1)}`);
  }
  if (Math.abs(c.drg.baseAvg - 7800) > 1e-6) throw new Error('基线平均成本应为 7,800: ' + c.drg.baseAvg);
  if (Math.abs(c.drg.newAvg - 7200) > 1e-6) throw new Error('调整后平均成本应为 7,200: ' + c.drg.newAvg);
  if (Math.abs(c.drg.newTotal / 1e4 - 800) > 1e-6) throw new Error('调整后结余应为 800 万元: ' + c.drg.newTotal);
  if (!body.includes('800 万元')) throw new Error('正文与复算不一致：调整后结余');
  if (Math.abs(c.dip.point - 80) > 1e-6) throw new Error('点值应为 80 元/点: ' + c.dip.point);
  if (Math.abs(c.dip.pointAfter - 69.57) > 0.01) throw new Error('做量后点值应为 69.57: ' + c.dip.pointAfter);
  if (Math.abs(c.dip.drop + 13.0) > 0.05) throw new Error('点值降幅应为 13.0%: ' + c.dip.drop);
  if (!body.includes('69.57')) throw new Error('正文与复算不一致：做量后点值');
  if (Math.abs(c.synMean - 163.3) > 0.05) throw new Error('证型均值应为 163.3: ' + c.synMean);
  const s = c.synOut.map((x) => x.surplus);
  if (!(s[0] > 0 && Math.abs(s[1]) < 4 && s[2] < 0)) throw new Error('三证型结余方向不符');
  if (!body.includes('−46.7')) throw new Error('正文与复算不一致：重证型亏损');
}

function main() {
  const body = read();
  const tables = parseTables(body);
  const f = fracture(body);
  const ct = costTable(tables, body);
  const d = drg(body);
  const p = dip(body);
  const syn = syndromes(body);
  const c = compute(f, ct, d, p, syn);
  verify(f, ct, d, p, c, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log('一、按项目付费：量增即利润增，技术选择由损益决定');
  console.log(`  手法复位 ${f.manual.fee} − ${f.manual.cost} = ${c.project.manual.toLocaleString('en-US')} 元/例`);
  console.log(`  切开复位 ${f.surgery.fee.toLocaleString('en-US')} − ${f.surgery.cost.toLocaleString('en-US')} = +${c.project.surgery.toLocaleString('en-US')} 元/例`);
  console.log(`  打包 ${f.bundle.toLocaleString('en-US')} 元后：手法复位 +${c.bundle.manual.toLocaleString('en-US')}、手术 ${c.bundle.surgery.toLocaleString('en-US')} → 技术选择反转`);
  console.log('');
  console.log(`二、成本核算：固定成本 ${(ct.fixed / 10000).toLocaleString('en-US')} 万，每例变动 ${ct.vc} 元，价格 ${ct.price} 元`);
  for (const r of c.costs) {
    console.log(`  ${String(r.volume).padStart(6)} 例 · 单位固定 ${r.unitFixed.toFixed(1)} · 单位总成本 ${r.unitTotal.toFixed(1)} · 单例损益 ${r.profit.toFixed(1)}`);
  }
  console.log('  量降 → 单位成本升 → 账面亏损 → 提价或缩量 → 量再降：这就是死亡螺旋，钥匙是边际成本。');
  console.log('');
  console.log('三、按病种：支付固定、成本自担，改收治结构就能改利润');
  console.log(`  基线均价 ${c.drg.baseAvg.toFixed(0)} 元，结余 ${c.drg.baseSurplus.toFixed(0)} 元/例 · ${(c.drg.baseTotal / 1e4).toFixed(0)} 万元`);
  console.log(`  调结构后均价 ${c.drg.newAvg.toFixed(0)} 元，结余 ${c.drg.newSurplus.toFixed(0)} 元/例 · ${(c.drg.newTotal / 1e4).toFixed(0)} 万元`);
  console.log('');
  console.log('四、按分值：总额固定，点值随量浮动');
  console.log(`  基线点值 ${c.dip.point.toFixed(2)} 元/点；总量做高 ${(p.up * 100).toFixed(0)}% → ${c.dip.pointAfter.toFixed(2)} 元/点（${c.dip.drop.toFixed(1)}%）`);
  console.log('  所有机构一起多做，结果是人人都少收。');
  console.log('');
  console.log('五、中医打包：同一病名下三个证型，按均值打包必亏重证');
  for (const x of c.synOut) {
    console.log(`  ${x.name} 成本 ${x.cost} 元 · 按均值 ${c.synMean.toFixed(1)} 打包 · 结余 ${x.surplus > 0 ? '+' : ''}${x.surplus.toFixed(1)} 元`);
  }
  console.log('');
  console.log('※ 选择支付方式，本质是选择一组你愿意长期监测并承担的成本。');
  console.log('※ 本输出仅用于教学演示，不构成任何定价、支付标准或临床技术选择的建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, parseTables, fracture, costTable, drg, dip, syndromes,
  compute, verify, num,
};
