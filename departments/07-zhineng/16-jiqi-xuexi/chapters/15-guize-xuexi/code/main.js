#!/usr/bin/env node
/**
 * 机器学习 · 第 15 章 规则的代价不是条数，是它覆盖了多少不该覆盖的
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/15-guize-xuexi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 1,000 条样本与 400 条阳性、两条规则的覆盖与判对数、信息增益算例，
 * 重算精度、覆盖率、召回、FOIL 增益与 RIPPER 指标，再与正文逐项对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc(file = DOC) {
  if (!fs.existsSync(file)) throw new Error('找不到正文: ' + file);
  return fs.readFileSync(file, 'utf8');
}

function need(text, re, label, group = 1) {
  const m = text.match(re);
  if (!m) throw new Error('正文里没找到' + label + '的设定');
  return m[group];
}
const needNum = (t, re, l, g) => Number(need(t, re, l, g));

const precisionOf = (hit, n) => hit / n;
const coverageOf = (n, m) => n / m;
const recallOf = (hit, pos) => hit / pos;

/** FOIL 信息增益：n·(log2(正/覆盖) − log2(基准率)) */
function foilGain(nr, nrPos, nPos, m) {
  return nr * (Math.log2(nrPos / nr) - Math.log2(nPos / m));
}

/** RIPPER 的剪枝指标：(p − n)/(p + n) */
const ripper = (p, n) => (p - n) / (p + n);

const f1 = (prec, rec) => (2 * prec * rec) / (prec + rec);

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*([\d,]+)\s*条样本、阳性\s*(\d+)\s*条/);
  if (!head) throw new Error('正文里没找到样本与阳性数');
  const a = doc.match(/规则甲「[^」]+」覆盖\s*(\d+)\s*条，其中\s*(\d+)\s*条确实是风寒——精度\s*([\d.]+)，覆盖率\s*([\d.]+)/);
  const b = doc.match(/规则乙「[^」]+」覆盖\s*(\d+)\s*条，其中\s*(\d+)\s*条对——精度\s*([\d.]+)，覆盖率\s*([\d.]+)/);
  if (!a || !b) throw new Error('正文里没找到两条规则的覆盖设定');

  return {
    m: Number(head[1].replace(/,/g, '')),
    pos: Number(head[2]),
    aN: Number(a[1]),
    aHit: Number(a[2]),
    aAcc: Number(a[3]),
    aCov: Number(a[4]),
    bN: Number(b[1]),
    bHit: Number(b[2]),
    bAcc: Number(b[3]),
    bCov: Number(b[4]),
    recallA: needNum(doc, /\| 召回 \|[\s\S]{0,40}?\|\s*([\d.]+)\s*\|/, '甲的召回'),
    recallB: needNum(doc, /\| 召回 \|[\s\S]{0,60}?\|\s*[\d.]+\s*\|\s*([\d.]+)\s*\|/, '乙的召回'),
    gainA: needNum(doc, /80\\times0\.585=([\d.]+)/, 'A 的增益'),
    gainB: needNum(doc, /150\\times0\.552=([\d.]+)/, 'B 的增益'),
    gainAN: needNum(doc, /加条件 A 后覆盖\s*(\d+)\s*条、(\d+)\s*条正/, 'A 的覆盖'),
    gainAPos: needNum(doc, /加条件 A 后覆盖\s*\d+\s*条、(\d+)\s*条正/, 'A 的正例数'),
    gainBN: needNum(doc, /加条件 B 后覆盖\s*(\d+)\s*条、(\d+)\s*条正/, 'B 的覆盖'),
    gainBPos: needNum(doc, /加条件 B 后覆盖\s*\d+\s*条、(\d+)\s*条正/, 'B 的正例数'),
    baseN: needNum(doc, /当前规则覆盖\s*(\d+)\s*条、其中\s*(\d+)\s*条正/, '当前规则的覆盖'),
    basePos: needNum(doc, /当前规则覆盖\s*\d+\s*条、其中\s*(\d+)\s*条正/, '当前规则的正例'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const gainA = foilGain(s.gainAN, s.gainAPos, s.basePos, s.baseN);
  const gainB = foilGain(s.gainBN, s.gainBPos, s.basePos, s.baseN);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('甲的精度', precisionOf(s.aHit, s.aN), s.aAcc, 0.005);
  check('甲的覆盖率', coverageOf(s.aN, s.m), s.aCov, 0.005);
  check('甲的召回（2 位小数）', Number(recallOf(s.aHit, s.pos).toFixed(2)), s.recallA, 0.005);
  check('乙的精度', precisionOf(s.bHit, s.bN), s.bAcc, 0.005);
  check('乙的覆盖率', coverageOf(s.bN, s.m), s.bCov, 0.005);
  check('乙的召回（2 位小数）', Number(recallOf(s.bHit, s.pos).toFixed(2)), s.recallB, 0.005);
  check('条件 A 的信息增益（1 位小数）', Number(gainA.toFixed(1)), s.gainA, 0.15);
  check('条件 B 的信息增益（1 位小数）', Number(gainB.toFixed(1)), s.gainB, 0.15);
  check('RIPPER 指标（10 正 0 反）', ripper(10, 0), 1, 1e-12);
  check('RIPPER 指标（10 正 5 反）', Number(ripper(10, 5).toFixed(2)), 0.33, 0.005);
  check('RIPPER 指标（0 正 5 反）', ripper(0, 5), -1, 1e-12);

  // 权衡：甲精度更高、乙覆盖与召回更高，增益选乙
  if (!(s.aAcc > s.bAcc)) throw new Error('甲的精度应高于乙');
  if (!(s.bN > s.aN && gainB > gainA)) throw new Error('乙的覆盖与增益应更高');

  return { setup: s, gainA, gainB, rows, f1A: f1(s.aAcc, recallOf(s.aHit, s.pos)), f1B: f1(s.bAcc, recallOf(s.bHit, s.pos)) };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 15 章 规则的代价不是条数，是它覆盖了多少不该覆盖的');
  console.log('');
  console.log(`${s.m} 条样本、阳性 ${s.pos} 条：`);
  for (const [tag, n, hit, acc, cov, rec] of [
    ['甲', s.aN, s.aHit, s.aAcc, s.aCov, r.setup.recallA],
    ['乙', s.bN, s.bHit, s.bAcc, s.bCov, r.setup.recallB],
  ]) {
    console.log(`  规则${tag}：覆盖 ${n} 条、判对 ${hit} 条 → 精度 ${precisionOf(hit, n).toFixed(2)}，覆盖率 ${coverageOf(n, s.m).toFixed(2)}，召回 ${recallOf(hit, s.pos).toFixed(2)}`);
  }
  console.log(`  甲更精确但只覆盖一成，乙覆盖三成却要错 ${s.bN - s.bHit} 条：没有单一指标能裁决`);
  console.log('');
  console.log('信息增益算例（当前覆盖 200 条、100 条正，基准率 0.5）：');
  console.log(`  加 A：覆盖 ${s.gainAN} 条、${s.gainAPos} 条正 → 增益 ${r.gainA.toFixed(1)}`);
  console.log(`  加 B：覆盖 ${s.gainBN} 条、${s.gainBPos} 条正 → 增益 ${r.gainB.toFixed(1)}，选中 B`);
  console.log(`  精度只看纯度，增益兼顾规模`);
  console.log('');
  console.log(`RIPPER 剪枝指标 (p−n)/(p+n)：(10,0)=${ripper(10, 0)}，(10,5)=${ripper(10, 5).toFixed(2)}，(0,5)=${ripper(0, 5)}`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，学出的规则不得直接作为辨证依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, precisionOf, coverageOf, recallOf, foilGain, ripper, f1, reconcile, DOC };
