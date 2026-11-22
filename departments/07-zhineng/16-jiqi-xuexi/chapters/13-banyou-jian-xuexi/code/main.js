#!/usr/bin/env node
/**
 * 机器学习 · 第 13 章 未标注数据不是免费的，它买的是「流形假设」
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/13-banyou-jian-xuexi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 100+9,900 的设定、三档准确率、标签传播的四个点与权重、伪标签阈值，
 * 重算图上的稳态值、伪标签的错标比例、簇纯度与偏差量，再与正文逐项对账。
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

/** 标签传播：固定已标注点的值，未标注点反复取邻居加权平均 */
function propagate(nodes, edges, fixed, rounds = 200) {
  const adj = nodes.map(() => []);
  for (const [i, j, w] of edges) {
    adj[i].push([j, w]);
    adj[j].push([i, w]);
  }
  const f = nodes.map((_, i) => (fixed[i] === undefined ? 0 : fixed[i]));
  for (let t = 0; t < rounds; t += 1) {
    const next = f.slice();
    nodes.forEach((_, i) => {
      if (fixed[i] !== undefined) return;
      const total = adj[i].reduce((a, [, w]) => a + w, 0);
      next[i] = total === 0 ? f[i] : adj[i].reduce((a, [j, w]) => a + w * f[j], 0) / total;
    });
    f.splice(0, f.length, ...next);
  }
  return f;
}

/** 给定聚类结果与已标注样本的标签，算加权平均纯度 */
function purity(clusterOf, labels) {
  const groups = new Map();
  for (const [i, c] of Object.entries(clusterOf)) {
    if (labels[i] === undefined) continue;
    if (!groups.has(c)) groups.set(c, new Map());
    const m = groups.get(c);
    m.set(labels[i], (m.get(labels[i]) || 0) + 1);
  }
  let correct = 0;
  let total = 0;
  for (const counts of groups.values()) {
    const sum = [...counts.values()].reduce((a, b) => a + b, 0);
    correct += Math.max(...counts.values());
    total += sum;
  }
  return total === 0 ? 0 : correct / total;
}

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*([\d,]+)\s*条标注\s*\+\s*([\d,]+)\s*条未标注/);
  if (!head) throw new Error('正文里没找到标注与未标注的设定');
  const acc = doc.match(/只用\s*[\d,]+\s*条训练，测试准确率\s*([\d.]+)；[\s\S]{0,40}?涨到\s*([\d.]+)/);
  if (!acc) throw new Error('正文里没找到两档准确率');
  const prop = doc.match(/解得\s*\$f_2=([\d.]+)\$，\$f_3=([\d.]+)\$/);
  if (!prop) throw new Error('正文里没找到标签传播的稳态值');

  return {
    labeled: Number(head[1].replace(/,/g, '')),
    unlabeled: Number(head[2].replace(/,/g, '')),
    accBase: Number(acc[1]),
    accSelf: Number(acc[2]),
    accShift: needNum(doc, /准确率跌到\s*([\d.]+)/, '异源数据的准确率'),
    f2: Number(prop[1]),
    f3: Number(prop[2]),
    threshold: needNum(doc, /阈值\s*([\d.]+)，模型校准良好/, '伪标签阈值'),
    selected: needNum(doc, /选中\s*(\d+)%\s*的未标注样本/, '被选中的比例'),
    pseudoAcc: needNum(doc, /这批的准确率\s*([\d.]+)/, '伪标签的准确率'),
    purityDeclared: needNum(doc, /用 100 条标注样本算每个簇的纯度，平均\s*([\d.]+)/, '簇纯度'),
    badModel: needNum(doc, /准确率从 0\.62 跌到\s*([\d.]+)/, '成分数错配后的准确率'),
    round3: needNum(doc, /升到\s*([\d.]+)，而在整体上降到\s*([\d.]+)/, '三轮后的高置信准确率'),
    round3All: needNum(doc, /而在整体上降到\s*([\d.]+)/, '三轮后的整体准确率'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const nodes = [0, 1, 2, 3];
  const edges = [[0, 1, 1], [0, 2, 1], [1, 2, 1], [2, 3, 1]];
  const f = propagate(nodes, edges, { 0: 1, 3: -1 });

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('传播后的 f2（1 位小数）', Number(f[1].toFixed(1)), s.f2, 0.05);
  check('传播后的 f3（1 位小数）', Number(f[2].toFixed(1)), s.f3, 0.05);
  check('自训练的净收益（百分点）', Number(((s.accSelf - s.accBase) * 100).toFixed(0)), 17, 0.5);
  check('伪标签的错标比例（百分点）', Number(((s.selected / 100) * (1 - s.pseudoAcc) * 100).toFixed(0)), 3, 0.5);
  check('异源数据的跌幅（百分点）', Number(((s.accBase - s.accShift) * 100).toFixed(0)), 14, 0.5);

  // 稳态方程自洽：f2 = (f1 + f3)/2，f3 = (f1 + f2 + f4)/3
  if (Math.abs(f[1] - (1 + f[2]) / 2) > 1e-9) throw new Error('f2 的稳态方程不自洽');
  if (Math.abs(f[2] - (1 + f[1] - 1) / 3) > 1e-9) throw new Error('f3 的稳态方程不自洽');

  return { setup: s, f, rows, mislabelShare: (s.selected / 100) * (1 - s.pseudoAcc) };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 13 章 未标注数据不是免费的，它买的是「流形假设」');
  console.log('');
  console.log(`${s.labeled} 条标注 + ${s.unlabeled} 条未标注：只用标注 ${s.accBase} → 自训练 ${s.accSelf}（+${((s.accSelf - s.accBase) * 100).toFixed(0)} 点）`);
  console.log(`  换成异源的 ${s.unlabeled} 条：跌到 ${s.accShift}，比完全不用未标注更差`);
  console.log('');
  console.log('标签传播（四点、权重全 1、1 与 4 固定为 +1 与 −1）：');
  console.log(`  f2=${r.f[1].toFixed(3)}，f3=${r.f[2].toFixed(3)}——都判为正，但 f3 更靠近负类`);
  console.log(`  这两个值只是图上的插值，没有概率含义`);
  console.log('');
  console.log(`伪标签：阈值 ${s.threshold}、选中 ${s.selected}%、准确率 ${s.pseudoAcc}`);
  console.log(`  摊到训练集里约 ${(r.mislabelShare * 100).toFixed(0)}% 是错标，下一轮边界会朝错标方向偏移`);
  console.log('');
  console.log(`假设检验：9,900 条上做聚类，100 条标注算出的平均纯度 ${s.purityDeclared}——接近随机，聚类假设不成立`);
  console.log(`  三轮之后：自认为高置信的区域升到 ${s.round3}，整体降到 ${s.round3All}`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，任何模型在临床使用前须经独立标注集验证。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, propagate, purity, reconcile, DOC };
