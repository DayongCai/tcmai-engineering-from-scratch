#!/usr/bin/env node
/**
 * 机器学习 · 第 14 章 图不是画给人看的，是用来读条件独立的
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/14-gailv-tu-moxing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 20 个二值变量的链式设定、HMM 的 π/A/B 与观测序列，
 * 重算联合空间规模、链式参数量、前向概率，再与正文逐项对账。
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

const jointParams = (d) => Math.pow(2, d);

/** 链式结构：每个非根节点一张 2×2 条件概率表，根节点 1 个自由参数 */
const chainParams = (d) => (d - 1) * 4 + 1;

/** HMM 前向算法 */
function forward(pi, A, B, obs) {
  const K = pi.length;
  const alpha = [];
  alpha.push(pi.map((p, i) => p * B[i][obs[0]]));
  for (let t = 1; t < obs.length; t += 1) {
    const prev = alpha[t - 1];
    alpha.push(A.map((_, j) => prev.reduce((a, p, i) => a + p * A[i][j], 0) * B[j][obs[t]]));
  }
  return alpha;
}

/** 变量消去的粗量级：d · k^(w+1) */
const veCost = (d, k, w) => d * Math.pow(k, w + 1);

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*(\d+)\s*个二值变量/);
  if (!head) throw new Error('正文里没找到变量个数');
  const params = doc.match(/参数量是\s*\$(\d+)\\times4\+1=(\d+)\$/);
  if (!params) throw new Error('正文里没找到链式参数量');
  const pi = doc.match(/\\pi=\(([\d.]+),([\d.]+)\)/);
  const A = doc.match(/\\mathbf\{A\}=\\begin\{pmatrix\}([\d.]+)&([\d.]+)\\\\([\d.]+)&([\d.]+)\\end\{pmatrix\}/);
  if (!pi || !A) throw new Error('正文里没找到 HMM 参数');

  return {
    d: Number(head[1]),
    chainShells: Number(params[1]),
    chainTotal: Number(params[2]),
    jointDeclaredWan: needNum(doc, /\\approx(\d+)\$?\s*万个数/, '联合分布（万）'),
    pi: [Number(pi[1]), Number(pi[2])],
    A: [[Number(A[1]), Number(A[2])], [Number(A[3]), Number(A[4])]],
    b1o1: needNum(doc, /状态 1 发 \$o_1\$ 为\s*([\d.]+)/, '状态 1 发 o1 的概率'),
    b1o2: needNum(doc, /发 \$o_1\$ 为 [\d.]+、发 \$o_2\$ 为 ([\d.]+)/, '状态 1 发 o2 的概率'),
    b2o1: needNum(doc, /状态 2 发 \$o_1\$ 为\s*([\d.]+)/, '状态 2 发 o1 的概率'),
    b2o2: needNum(doc, /状态 2 发 \$o_1\$ 为 [\d.]+、发 \$o_2\$ 为 ([\d.]+)/, '状态 2 发 o2 的概率'),
    alpha1: doc.match(/\$\\alpha_1=\(0\.6\\times([\d.]+),\\ 0\.4\\times([\d.]+)\)=\(([\d.]+),\\ ([\d.]+)\)\$/) || null,
    a1Declared: doc.match(/\\alpha_1=\(0\.6\\times0\.5,\\ 0\.4\\times0\.1\)=\(([\d.]+),\\ ([\d.]+)\)/),
    a2Declared: doc.match(/状态 1 为[\s\S]{0,80}?=([\d.]+)\$；状态 2 为[\s\S]{0,90}?=([\d.]+)\$/),
    totalDeclared: needNum(doc, /序列概率：\$0\.113\+0\.0114=([\d.]+)\$/, '序列概率'),
    chainW: needNum(doc, /一条 1,000 个变量的链，树宽是\s*([\d.]+)/, '链的树宽'),
    denseW: needNum(doc, /20 个变量的完全图，树宽\s*([\d.]+)/, '完全图的树宽'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  if (!s.a1Declared || !s.a2Declared) throw new Error('正文里没找到前向概率的算例');
  const B = [[s.b1o1, s.b1o2], [s.b2o1, s.b2o2]];
  const alpha = forward(s.pi, s.A, B, [0, 0]);
  const total = alpha[1].reduce((a, b) => a + b, 0);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('联合空间（万）', jointParams(s.d) / 1e4, s.jointDeclaredWan, 0.6);
  check('链式参数量', chainParams(s.d), s.chainTotal, 0);
  check('条件概率表个数', chainParams(s.d) / 4 | 0, s.chainShells, 0);
  check('α1 状态 1', Number(alpha[0][0].toFixed(2)), Number(s.a1Declared[1]), 0.005);
  check('α1 状态 2', Number(alpha[0][1].toFixed(2)), Number(s.a1Declared[2]), 0.005);
  check('α2 状态 1（3 位小数）', Number(alpha[1][0].toFixed(3)), Number(s.a2Declared[1]), 0.0005);
  check('α2 状态 2（4 位小数）', Number(alpha[1][1].toFixed(4)), Number(s.a2Declared[2]), 0.00005);
  check('序列概率（4 位小数）', Number(total.toFixed(4)), s.totalDeclared, 0.00005);

  // 树宽决定推断量级：链线性，完全图指数
  if (!(veCost(1000, 2, 1) < veCost(20, 2, 19))) throw new Error('链的推断量级应当远小于完全图');

  return { setup: s, B, alpha, total, rows, chainCost: veCost(1000, 2, 1), denseCost: veCost(20, 2, 19) };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 14 章 图不是画给人看的，是用来读条件独立的');
  console.log('');
  console.log(`${s.d} 个二值变量：联合分布 ${jointParams(s.d).toLocaleString('en-US')} 个参数（约 ${(jointParams(s.d) / 1e4).toFixed(0)} 万）`);
  console.log(`  链式分解后只需 ${chainParams(s.d)} 个（${s.chainShells} 张条件概率表 × 4，加根节点 1 个）`);
  console.log(`  这是精确等价，不是近似；换来的是 19 条「只依赖前一个」的假设`);
  console.log('');
  console.log('前向算法（π=(0.6,0.4)，观测 o1、o1）：');
  console.log(`  α1 = (${r.alpha[0].map((v) => v.toFixed(3)).join(', ')})`);
  console.log(`  α2 = (${r.alpha[1].map((v) => v.toFixed(4)).join(', ')})，序列概率 ${r.total.toFixed(4)}`);
  console.log(`  第二步是「先把到达该状态的路径求和，再乘发射概率」，不必枚举所有路径`);
  console.log('');
  console.log(`推断量级：1,000 变量的链（树宽 ${s.chainW}）≈ ${r.chainCost.toLocaleString('en-US')} 步；20 变量的完全图（树宽 ${s.denseW}）≈ ${r.denseCost.toLocaleString('en-US')} 步`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，学到的图结构不得解释为因果机制。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, jointParams, chainParams, forward, veCost, reconcile, DOC };
