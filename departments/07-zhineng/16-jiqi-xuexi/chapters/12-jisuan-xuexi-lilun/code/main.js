#!/usr/bin/env node
/**
 * 机器学习 · 第 12 章 泛化界不是承诺，是最坏情况下你还剩多少
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/12-jisuan-xuexi-lilun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 |H|、m、δ、VC 维与目标精度的设定，
 * 重算 Hoeffding 加 union bound 的界、VC 界项、反解出的样本量，再与正文逐项对账。
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

/** Hoeffding + union bound 给出的界 */
const pacEpsilon = (h, m, delta) => Math.sqrt((Math.log(h) + Math.log(1 / delta)) / (2 * m));

/** 反解：达到指定精度所需样本量 */
const requiredSamples = (h, eps, delta) => (Math.log(h) + Math.log(1 / delta)) / (2 * eps * eps);

/** VC 界项（省去对数因子，按正文的量级写法） */
const vcTerm = (dvc, m, delta) => Math.sqrt((dvc * Math.log(m / dvc) + Math.log(1 / delta)) / m);

function parseSetup(doc) {
  const head = doc.match(/假设空间大小\s*\$?\\?\|?\\mathcal\{H\}[\s\S]{0,12}?=([\d{},]+)\$?、样本\s*\$m=([\d{},]+)\$、置信度\s*\$1-\\delta=([\d.]+)\$/);
  if (!head) throw new Error('正文里没找到 |H|、m、δ 的设定');
  const num = (s) => Number(String(s).replace(/[{},]/g, ''));

  return {
    h: num(head[1]),
    m: num(head[2]),
    delta: Number((1 - Number(head[3])).toFixed(10)),
    eps: needNum(doc, /\\frac\{6\.91\+3\.00\}\{20\{,\}000\}\}=([\d.]+)\$/, 'ε 的声明值'),
    epsLarge: needNum(doc, /\\varepsilon\$ 只涨到\s*([\d.]+)/, '|H|=10^6 时的界'),
    dvc: needNum(doc, /演算设定\s*\$d_\{VC\}=(\d+)\$/, 'VC 维'),
    vcTermDeclared: needNum(doc, /界项\s*([\d.]+)。\*\*[\d.]+ 个百分点/, 'VC 界项'),
    vcGap: needNum(doc, /实测的训练测试差距可能只有\s*(\d+)\s*个点/, '实测差距'),
    mDeclared: Number('2' + need(doc, /=\s*2\{,\}(\d+)\$/, '所需样本量')),
    mTight: Number(need(doc, /m\\ge12\.21\/0\.0008=([\d{},]+)\$/, '精度 0.02 所需样本量').replace(/[{},]/g, '')),
    mWide: Number(need(doc, /\(2\\times0\.0009\)=([\d{},]+)\$/, '反驳所需的样本量').replace(/[{},]/g, '')),
    hWideExp: needNum(doc, /放大到\s*\$10\^(\d+)\$/, '|H| 的指数'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const h6 = Math.pow(10, s.hWideExp);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('ε（|H|=1,000，3 位小数）', Number(pacEpsilon(s.h, s.m, s.delta).toFixed(3)), s.eps, 0.0005);
  check('ε（|H|=10^6，3 位小数）', Number(pacEpsilon(h6, s.m, s.delta).toFixed(3)), s.epsLarge, 0.0005);
  check('VC 界项（3 位小数）', Number(vcTerm(s.dvc, s.m, s.delta).toFixed(3)), s.vcTermDeclared, 0.0005);
  check('反解样本量（ε=0.05）', Number(requiredSamples(1e4, 0.05, 0.05).toFixed(0)), s.mDeclared, 2);
  check('反解样本量（ε=0.02）', Number(requiredSamples(1e4, 0.02, 0.05).toFixed(0)), s.mTight, 10);
  check('反驳所需的样本量', Number(requiredSamples(h6, 0.03, 0.05).toFixed(0)), s.mWide, 10);

  // 界的三个性质：对 ln|H| 线性、对 m 取平方根、界比实测松得多
  if (!(s.epsLarge > s.eps)) throw new Error('放大假设空间后界应当变大');
  if (!(s.vcTermDeclared > s.vcGap / 100 * 5)) throw new Error('界项应远大于实测差距');

  return { setup: s, h6, rows, eps6: pacEpsilon(h6, s.m, s.delta) };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 12 章 泛化界不是承诺，是最坏情况下你还剩多少');
  console.log('');
  console.log(`|H|=${s.h}、m=${s.m}、δ=${s.delta}：ε = √((ln|H|+ln(1/δ))/(2m)) = ${pacEpsilon(s.h, s.m, s.delta).toFixed(3)}`);
  console.log(`  |H| 放大到 ${r.h6.toExponential(0)} 时 ε = ${r.eps6.toFixed(3)}：指数级扩大假设空间，代价只有线性的`);
  console.log('');
  console.log(`VC 维 d=${s.dvc}：界项 ${vcTerm(s.dvc, s.m, s.delta).toFixed(3)}，而实测差距只有 ${s.vcGap} 个点`);
  console.log(`  三层松弛叠加：union bound 当假设互不相关、Hoeffding 不用方差、VC 维是全局量`);
  console.log('');
  console.log('反解「要多大的样本量」：');
  console.log(`  ε=0.05 → ${requiredSamples(1e4, 0.05, 0.05).toFixed(0)} 例；ε=0.02 → ${requiredSamples(1e4, 0.02, 0.05).toFixed(0)} 例（精度提高 2.5 倍，样本量 6.25 倍）`);
  console.log(`  声称 |H|=${r.h6.toExponential(0)}、误差 3% 却只有 500 例 → 反解得 ${requiredSamples(r.h6, 0.03, 0.05).toFixed(0)} 例，差一个数量级`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，任何基于泛化界的性能声明不得作为临床部署依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, pacEpsilon, requiredSamples, vcTerm, reconcile, DOC };
