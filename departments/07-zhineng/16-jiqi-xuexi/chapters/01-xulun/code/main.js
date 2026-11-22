#!/usr/bin/env node
/**
 * 机器学习 · 第 1 章 泛化不是模型的属性
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/01-xulun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出本章的演算设定（三个二值属性、8 条训练样例、p=0.10、n=100），
 * 重算假设空间规模、测试集标准误与 95% 波动区间，再与正文写下的数字逐项对账。
 * 任何一项对不上就抛错，避免手打数字在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc(file = DOC) {
  if (!fs.existsSync(file)) throw new Error('找不到正文: ' + file);
  return fs.readFileSync(file, 'utf8');
}

/** 从正文里抽出演算设定；抽不到就报错，不猜默认值。 */
function parseSetup(doc) {
  const attrs = /三个属性/.test(doc) ? 3 : null;
  const values = /每个属性二值/.test(doc) ? 2 : null;
  const train = matchInt(doc, /(\d+)\s*条训练样例/, '训练样例条数');
  const p = matchNum(doc, /真实错误率\s*\$?p\s*=\s*([\d.]+)/, '真实错误率 p');
  const n = matchInt(doc, /测试集大小\s*\$?n\s*=\s*(\d+)/, '测试集大小 n');
  const declared = {
    hypotheses: matchInt(doc, /共\s*\*\*(\d+)\*\*\s*个候选规律/, '假设空间规模'),
    sigma: matchNum(doc, /\\sigma\s*\\approx\s*\\sqrt\{[\s\S]{0,160}?\\approx\s*([\d.]+)/, '标准误'),
    ciPoints: matchNum(doc, /\$\\pm\s*(\d+)\$\s*个百分点/, '95% 区间（百分点）'),
  };
  return { attrs, values, train, p, n, declared };
}

function matchInt(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里没找到' + label + '的设定');
  return Number(m[1]);
}

function matchNum(text, re, label) {
  const m = text.match(re);
  if (!m) throw new Error('正文里没找到' + label + '的设定');
  const raw = m[1] || m[2];
  return Number(raw);
}

/** |H| = 连乘 (n_j + 1) 再加空假设 */
function hypothesisSpace(attrs, values) {
  let size = 1;
  for (let j = 0; j < attrs; j += 1) size *= values + 1;
  return size + 1;
}

const stderr = (p, n) => Math.sqrt((p * (1 - p)) / n);
const halfWidth95 = (p, n) => 1.96 * stderr(p, n);
/** 要把 95% 半宽压到 hw，所需样本量 */
const nForHalfWidth = (p, hw) => (p * (1 - p) * Math.pow(1.96 / hw, 2));

function reconcile(doc) {
  const s = parseSetup(doc);
  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed, declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
    return ok;
  };

  check('假设空间规模', hypothesisSpace(s.attrs, s.values), s.declared.hypotheses, 0);
  check('标准误（3 位小数）', Number(stderr(s.p, s.n).toFixed(3)), s.declared.sigma, 0.0005);
  check('95% 区间（百分点）', Math.round(halfWidth95(s.p, s.n) * 100), s.declared.ciPoints, 0);

  return {
    setup: s,
    rows,
    sigma: stderr(s.p, s.n),
    half: halfWidth95(s.p, s.n),
    nFor2Points: nForHalfWidth(s.p, 0.02),
    nFor1Point: nForHalfWidth(s.p, 0.01),
  };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);

  console.log('机器学习 · 第 1 章 泛化不是模型的属性');
  console.log('');
  console.log(`演算设定：${r.setup.attrs} 个二值属性 · ${r.setup.train} 条训练样例 · p=${r.setup.p} · n=${r.setup.n}`);
  console.log('');
  console.log('与正文对账：');
  for (const row of r.rows) console.log(`  ${row.ok ? '✓' : '✗'} ${row.label}：现算 ${row.computed} / 正文 ${row.declared}`);
  console.log('');
  console.log(`每个属性的出现方式 = ${r.setup.values} 个具体值 + 1 个通配符 = ${r.setup.values + 1}；`);
  console.log(`假设空间 = (${r.setup.values + 1})^${r.setup.attrs} + 1 = ${r.setup.declared.hypotheses}`);
  console.log(`标准误 = √(p(1-p)/n) = ${r.sigma.toFixed(4)} → 95% 半宽 ${(r.half * 100).toFixed(1)} 个百分点`);
  console.log('');
  console.log(`要把 95% 半宽压到 ±2 个百分点，n 需从 ${r.setup.n} 提到约 ${Math.round(r.nFor2Points)}（${(r.nFor2Points / r.setup.n).toFixed(1)} 倍）；`);
  console.log(`压到 ±1 个百分点，需约 ${Math.round(r.nFor1Point)} 例。`);
  console.log('');
  console.log('※ 数值全部由正文演算设定现算并与正文对账，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, hypothesisSpace, stderr, halfWidth95, nForHalfWidth, reconcile, DOC };
