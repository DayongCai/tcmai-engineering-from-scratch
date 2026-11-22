#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 1 章 导论与数据资源：数据不是资产，被追责的数据才是
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/01-i1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数全部从本章正文现读：年出院人次、首页字段数、抽样份数、错份数、权重影响、每权重结算额。
 * 复算抽样错误率、全年带错首页数、年结算偏差量级；并清点正文里的四类资源、六维质量、七个生命周期阶段。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '导论与数据资源：数据不是资产，被追责的数据才是';

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

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
const one = (re, body, name) => {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到' + name);
  return m[1];
};

/** 从正文的演算段落读参数。 */
function params(body) {
  return {
    discharges: Number(one(/年出院 ([\d.]+) 万人次/, body, '年出院人次')) * 10000,
    fields: Number(one(/病案首页 (\d+) 个字段/, body, '首页字段数')),
    sampled: Number(one(/抽 (\d+) 份复核/, body, '抽样份数')),
    errors: Number(one(/发现 (\d+) 份存在/, body, '错份数')),
    weightImpact: Number(one(/平均影响 ([\d.]+) 个权重/, body, '权重影响')),
    pricePerWeight: Number(one(/每权重结算 ([\d.]+) 万元/, body, '每权重结算额')),
  };
}

/** 三个层次、四类资源、七个阶段、六个质量维——都按正文结构清点。 */
function structure(body, tables) {
  const layers = ['业务记录', '摘要', '知识'].filter((k) => body.includes(k)).length;
  const resTable = tables.find((t) => t.header.includes('资源') && t.header.includes('责任人'));
  const qTable = tables.find((t) => t.header.includes('维度') && t.header.includes('分母'));
  const stages = ['产生', '采集', '存储', '加工', '使用', '归档', '销毁']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  if (!resTable) throw new Error('正文里没找到四类资源表');
  if (!qTable) throw new Error('正文里没找到质量六维表');
  return {
    layers,
    resources: resTable.rows.length,
    dimensions: qTable.rows.length,
    stages,
    stageNames: resTable.rows.map((r) => r[0]),
    dimNames: qTable.rows.map((r) => r[0]),
  };
}

/** 复算：抽样错误率 → 全年带错首页数 → 年结算偏差量级。 */
function compute(p) {
  const errRate = p.errors / p.sampled;
  const badPerYear = Math.round(p.discharges * errRate);
  const deviation = badPerYear * p.weightImpact * p.pricePerWeight; // 万元
  const magnitude = Math.floor(deviation / 100) * 100;
  return {
    errRate,
    errPct: (errRate * 100).toFixed(1),
    badPerYear,
    deviation,
    magnitude,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, body) {
  const must = [
    [`${c.errPct}%`, '抽样错误率'],
    [fmt(c.badPerYear), '全年带错首页数'],
    [`${fmt(c.magnitude)} 万元`, '年结算偏差量级'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (s.layers !== 3) throw new Error('三层结构不完整: ' + s.layers);
  if (s.resources !== 4) throw new Error('四类资源表行数异常: ' + s.resources);
  if (s.dimensions !== 6) throw new Error('质量六维行数异常: ' + s.dimensions);
  if (s.stages !== 7) throw new Error('生命周期阶段数异常: ' + s.stages);
}

function main() {
  const body = read();
  const s = structure(body, parseTables(body));
  const p = params(body);
  const c = compute(p);
  verify(c, s, body);

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`抽 ${p.sampled} 份、${p.errors} 份至少一处关键字段错 → 抽样错误率 ${c.errPct}%`);
  console.log(`年出院 ${fmt(p.discharges)} 人次 × ${c.errPct}% → 全年约 ${fmt(c.badPerYear)} 份首页带错`);
  console.log(`每份偏差 ${p.weightImpact} 个权重 × 每权重 ${p.pricePerWeight} 万元 → 年结算偏差 ${c.deviation.toFixed(0)} 万元（${fmt(c.magnitude)} 万元量级）`);
  console.log('');
  console.log(`结构清点：${s.layers} 层对象 · ${s.resources} 类资源 · ${s.stages} 个生命周期阶段 · ${s.dimensions} 个质量维`);
  console.log(`  资源：${s.stageNames.join('、')}`);
  console.log(`  质量维：${s.dimNames.join('、')}`);
  console.log('');
  console.log('※ 偏差量级的作用不是精确，而是说明编码质量不是档案室的内部事务。');
  console.log('※ 本输出仅用于教学演示，不构成信息化建设或数据权属意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify, fmt };
