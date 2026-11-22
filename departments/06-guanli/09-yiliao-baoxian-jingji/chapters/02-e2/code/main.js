#!/usr/bin/env node
/**
 * 卫生经济学 · 第 2 章 医疗的需求是被供给方写出来的：「物多则贱」在这里失效
 * 课程: departments/06-guanli/09-yiliao-baoxian-jingji/chapters/02-e2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两组数都从本章正文现读现算：
 *   1) 目标收入模型——固定成本、目标净收入、单价、变动成本由正文给出，推出所需诊次与缺口；
 *   2) 共付杠杆——自付比例表逐行复算两档弹性下的需求量变化。
 * 表格一格改动，复算与正文若不一致就报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '医疗的需求是被供给方写出来的：「物多则贱」在这里失效';

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
  const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
/** 正文用 U+2212（−）写负号，与 ASCII 减号必须一并识别。 */
const signed = (s) => {
  const t = String(s).replace(/,/g, '').replace(/\u2212/g, '-');
  const m = t.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/** 从 PROBLEM 段读出目标收入模型的四个参数（单位：元）。 */
function modelParams(body) {
  const grab = (re, label) => {
    const m = body.match(re);
    if (!m) throw new Error('正文里读不到' + label);
    return Number(m[1]);
  };
  return {
    fixed: grab(/年固定成本\s*([\d,]+)\s*万元/, '固定成本') * 10000,
    target: grab(/目标净收入\s*([\d,]+)\s*万元/, '目标净收入') * 10000,
    price: grab(/每诊次收费\s*([\d,]+)\s*元/, '诊次收费'),
    vc: grab(/变动成本\s*([\d,]+)\s*元/, '变动成本'),
  };
}

/** 需要侧诊次从「项／值」表读出，用来对照缺口。 */
function needVisits(tables) {
  const t = tables.find((x) => x.header[0] === '项' && x.rows.some((r) => /需要/.test(r[0])));
  if (!t) throw new Error('正文里没找到诊次对照表');
  const r = t.rows.find((x) => /需要的诊次/.test(x[0]));
  return num(r[1]);
}

/** 共付表逐行复算：需求变化 = (患者面对价格/真实价格)^ε − 1。 */
function elasticityRows(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('自付比例')));
  if (!t) throw new Error('正文里没找到自付比例表');
  const eps = t.header.filter((h) => h.includes('ε')).map((h) => signed(h));
  return {
    eps,
    rows: t.rows.map((r) => ({
      share: num(r[0]),
      price: num(r[1]),
      stated: [r[2], r[3]],
    })),
  };
}

function compute(p, need) {
  const contribution = p.price - p.vc;
  const needed = (p.fixed + p.target) / contribution;
  const gap = needed - need;
  return {
    contribution,
    needed,
    gap,
    gapPct: (gap / need) * 100,
    extraRevenue: gap * contribution,
  };
}

function verify(c, need, el, body) {
  if (Math.abs(c.needed - 10000) > 1e-6) throw new Error('所需诊次与正文 10,000 不符: ' + c.needed);
  if (Math.abs(c.gapPct - 25) > 1e-9) throw new Error('缺口比例应为 25%: ' + c.gapPct);
  if (Math.abs(c.extraRevenue - 120000) > 1e-6) throw new Error('额外收入应为 12 万元: ' + c.extraRevenue);
  if (!body.includes('10,000 诊次')) throw new Error('正文与复算不一致：所需诊次');
  if (!body.includes('12 万元')) throw new Error('正文与复算不一致：缺口填平的额外收入');
  for (const row of el.rows) {
    for (let i = 0; i < el.eps.length; i += 1) {
      const got = (Math.pow(row.price / 100, el.eps[i]) - 1) * 100;
      const said = num(row.stated[i]);
      if (Math.abs(got - said) > 0.15) {
        throw new Error(`弹性表第 ${row.share}% 行与复算不符：正文 ${said}%，复算 ${got.toFixed(1)}%`);
      }
    }
  }
}

function main() {
  const body = read();
  const tables = parseTables(body);
  const p = modelParams(body);
  const need = needVisits(tables);
  const el = elasticityRows(tables);
  const c = compute(p, need);
  verify(c, need, el, body);

  console.log(`卫生经济学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`目标收入模型：固定成本 ${(p.fixed / 10000).toLocaleString('en-US')} 万，目标净收入 ${(p.target / 10000).toLocaleString('en-US')} 万`);
  console.log(`  每诊次边际贡献 ${p.price} − ${p.vc} = ${c.contribution} 元`);
  console.log(`  覆盖成本与目标收入所需诊次 ${c.needed.toLocaleString('en-US')}；医学测算需要 ${need.toLocaleString('en-US')}`);
  console.log(`  缺口 ${c.gap.toLocaleString('en-US')} 诊次（+${c.gapPct.toFixed(0)}%），按边际贡献折算恰好多出 ${(c.extraRevenue / 10000).toFixed(0)} 万元`);
  console.log('');
  console.log('共付杠杆逐行复算（患者面对价格 = 真实价格 × 自付比例）：');
  for (const row of el.rows) {
    const outs = el.eps.map((e) => `${((Math.pow(row.price / 100, e) - 1) * 100).toFixed(1)}%`);
    console.log(`  自付 ${String(row.share).padStart(3)}% → 价格 ${String(row.price).padStart(3)} · 需求 ${outs.join(' / ')}（ε = ${el.eps.join(' / ')}）`);
  }
  console.log('');
  console.log('※ 缺口不会写在账上叫「亏损」，它会以复诊次数、检查项目、适应证放宽的形式被填平。');
  console.log('※ 本输出仅用于教学演示，不构成对任何机构或医务人员的行为评价。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, modelParams, needVisits, elasticityRows, compute, verify, num };
