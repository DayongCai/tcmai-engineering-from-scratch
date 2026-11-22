#!/usr/bin/env node
/**
 * 机器学习 · 第 16 章 回报不是奖励的累加，是折现后的和
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/16-qianghua-xuexi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出三状态链的 γ、两状态值迭代的转移与奖励、正文给出的迭代表，
 * 重算折现回报、值迭代每一轮与不动点，再与正文逐格对账。
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

/** 折现回报：γ 的步数次方 */
const discounted = (gamma, steps) => Math.pow(gamma, steps);

/** 两状态链的值迭代：状态 1 得 1 转 2，状态 2 得 0 转 1 */
function valueIteration(gamma, rounds) {
  let v = [0, 0];
  const history = [v.slice()];
  for (let k = 0; k < rounds; k += 1) {
    v = [1 + gamma * v[1], 0 + gamma * v[0]];
    history.push(v.slice());
  }
  return history;
}

/** 不动点：V(1)=1+γV(2)，V(2)=γV(1) */
function fixedPoint(gamma) {
  const v1 = 1 / (1 - gamma * gamma);
  return [v1, gamma * v1];
}

/** 正文迭代表：| 轮次 | V(1) | V(2) | */
function parseTable(doc) {
  const rows = [];
  for (const line of doc.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+|∞)\s*\|\s*\**([\d.]+)\**\s*\|\s*\**([\d.]+)\**\s*\|$/);
    if (m) rows.push({ round: m[1] === '∞' ? Infinity : Number(m[1]), v1: Number(m[2]), v2: Number(m[3]) });
  }
  if (rows.length < 6) throw new Error('正文迭代表少于 6 行，格式可能已变');
  return rows;
}

function parseSetup(doc) {
  const gamma = needNum(doc, /折现因子\s*\$\\gamma=([\d.]+)\$/, '折现因子');
  const gamma2 = needNum(doc, /把\s*\$\\gamma\$ 改成\s*([\d.]+)/, '另一个折现因子');
  const chain = doc.match(/从\s*\$A\$\s*出发需要两步才到\s*\$C\$，回报是\s*\$0\.9\^2=([\d.]+)\$/);
  if (!chain) throw new Error('正文里没找到三状态链的回报');

  return {
    gamma,
    gamma2,
    chainReturn: Number(chain[1]),
    chainReturn2: needNum(doc, /回报变成\s*\$([\d.]+)\$/, 'γ=0.99 时的回报'),
    reword1: needNum(doc, /状态 1 执行\s*\$a\$\s*得奖励\s*(\d+) 并转到状态 2/, '状态 1 的奖励'),
    table: parseTable(doc),
    actions: needNum(doc, /(\d+)\s*个动作的\s*\$\\max\$\s*期望约为/, '动作个数'),
    maxBias: needNum(doc, /\\max\$\s*期望约为\s*\$?\+?([\d.]+)\$/, '最大值的偏差量级'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const history = valueIteration(s.gamma, 30);
  const fp = fixedPoint(s.gamma);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('两步后的回报（γ=0.9）', discounted(0.9, 2), s.chainReturn, 1e-9);
  check('两步后的回报（γ=0.99）', Number(discounted(0.99, 2).toFixed(4)), s.chainReturn2, 0.00005);

  for (const row of s.table) {
    if (row.round === Infinity) {
      check('不动点 V(1)', Number(fp[0].toFixed(3)), row.v1, 0.0005);
      check('不动点 V(2)', Number(fp[1].toFixed(3)), row.v2, 0.0005);
      continue;
    }
    const h = history[row.round];
    check(`第 ${row.round} 轮 V(1)`, Number(h[0].toFixed(3)), row.v1, 0.001);
    check(`第 ${row.round} 轮 V(2)`, Number(h[1].toFixed(3)), row.v2, 0.001);
  }

  // 收敛是几何的：误差每轮乘以 γ
  const err = (k) => Math.abs(history[k][0] - fp[0]);
  if (!(err(20) < err(10) && err(30) < err(20))) throw new Error('值迭代应当单调收敛');

  return { setup: s, history, fp, rows, table: s.table };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 16 章 回报不是奖励的累加，是折现后的和');
  console.log('');
  console.log(`三状态链 A→B→C，两步到终点的回报：γ=0.9 → ${discounted(0.9, 2)}；γ=0.99 → ${discounted(0.99, 2).toFixed(4)}`);
  console.log(`  同一策略、同一奖励，只是「好」的定义变了`);
  console.log('');
  console.log(`两状态值迭代（γ=${s.gamma}，状态 1 得 ${s.reword1} 转 2，状态 2 得 0 转 1）：`);
  for (const row of r.table) {
    const tag = row.round === Infinity ? '  ∞' : String(row.round).padStart(3);
    console.log(`  ${tag} 轮：V(1)=${row.v1}，V(2)=${row.v2}`);
  }
  console.log(`  不动点解：V(1)=1/(1−γ²)=${r.fp[0].toFixed(3)}，V(2)=${r.fp[1].toFixed(3)}`);
  console.log(`  V 远大于单步奖励，因为它是无限折现和`);
  console.log('');
  console.log(`max 偏差：${s.actions} 个动作、每个估计带噪声时，最大值的期望被系统抬高（量级 ${s.maxBias}）`);
  console.log(`  偏差在自举中累积，所以要 Double Q-learning 交叉更新`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成在高风险场景部署强化学习的许可。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, parseTable, discounted, valueIteration, fixedPoint, reconcile, DOC };
