#!/usr/bin/env node
/**
 * 机器学习 · 第 4 章 树的好坏不在深度，在你切的那一刀问的是什么问题
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/04-juece-shu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 6 条 3 正 3 负的演算设定、两刀切法的分组、覆盖与精度、剪枝的两组误差，
 * 重算熵、信息增益、基尼指数与剪枝判断，再与正文逐项对账。
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

/** 熵：传类别计数数组 */
function entropy(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const h = -counts.reduce((acc, c) => {
    if (c === 0) return acc;
    const p = c / total;
    return acc + p * Math.log2(p);
  }, 0);
  return h === 0 ? 0 : h; // 避免 -0
}

/** 基尼指数 */
function gini(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return 1 - counts.reduce((acc, c) => acc + (c / total) ** 2, 0);
}

/** 按样本占比加权的子节点不纯度 */
function weighted(groups, measure) {
  const total = groups.reduce((a, g) => a + g.reduce((x, y) => x + y, 0), 0);
  return groups.reduce((acc, g) => {
    const n = g.reduce((x, y) => x + y, 0);
    return acc + (n / total) * measure(g);
  }, 0);
}

const infoGain = (parent, groups) => entropy(parent) - weighted(groups, entropy);
const giniGain = (parent, groups) => gini(parent) - weighted(groups, gini);

function parseSetup(doc) {
  const head = doc.match(/演算设定\s*(\d+)\s*条样例、\s*(\d+)\s*正\s*(\d+)\s*负/);
  if (!head) throw new Error('正文里没找到本条的样例设定');
  const color = doc.match(/按「色泽」分成两组各\s*(\d+)\s*条、每组\s*(\d+)\s*正\s*(\d+)\s*负/);
  if (!color) throw new Error('正文里没找到「色泽」分组设定');
  const per = Number(color[2]) + Number(color[3]);

  return {
    total: Number(head[1]),
    pos: Number(head[2]),
    neg: Number(head[3]),
    groupSize: Number(color[1]),
    colorGroup: [Number(color[2]), Number(color[3])],
    per,
    colorEntropy: needNum(doc, /每组\s*2 正 1 负，\$\\text\{Ent\}\(D\^v\)=[\s\S]{0,80}?=([\d.]+)\$/, '色泽子组熵'),
    colorGain: needNum(doc, /加权后仍是\s*[\d.]+，增益\s*\$1-[\d.]+=([\d.]+)\$/, '色泽增益'),
    soundGain: needNum(doc, /增益\s*\$1-0=([\d.]+)\$/, '敲声增益'),
    giniParent: needNum(doc, /\$\\text\{Gini\}=1-\(0\.25\+0\.25\)=([\d.]+)\$/, '父节点基尼'),
    giniChild: needNum(doc, /\$\\text\{Gini\}=1-\(4\/9\+1\/9\)=([\d.]+)\$/, '色泽子组基尼'),
    giniGain: needNum(doc, /加权增益\s*\$[\d.]+-[\d.]+=([\d.]+)\$/, '基尼增益'),
    cover: Number(need(doc, /覆盖\s*(\d+)\s*条样本、判对\s*(\d+)\s*条/, '覆盖样本数')),
    hit: Number(need(doc, /覆盖\s*\d+\s*条样本、判对\s*(\d+)\s*条/, '判对样本数')),
    coverDeclared: needNum(doc, /则覆盖率\s*(\d+)%/, '覆盖率'),
    totalSamples: Number(need(doc, /（总样本\s*([\d,]+)）/, '总样本数').replace(/,/g, '')),
    precisionDeclared: needNum(doc, /、精度\s*([\d.]+)/, '精度'),
    prune: needNum(doc, /(\d+)\s*个叶子，训练误差\s*([\d.]+)，验证误差\s*([\d.]+)/, '叶子数'),
  };
}

function parsePrune(doc) {
  const m = doc.match(/(\d+)\s*个叶子，训练误差\s*([\d.]+)，验证误差\s*([\d.]+)；若把它剪成一个叶子，训练误差升到\s*([\d.]+)，验证误差降到\s*([\d.]+)/);
  if (!m) throw new Error('正文里没找到剪枝对比设定');
  return {
    leaves: Number(m[1]),
    treeTrain: Number(m[2]),
    treeVal: Number(m[3]),
    leafTrain: Number(m[4]),
    leafVal: Number(m[5]),
  };
}

/** 只按验证误差决定是否剪枝：剪了更好就剪 */
function shouldPrune(p) {
  return p.leafVal < p.treeVal;
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const prune = parsePrune(doc);
  const parent = [s.pos, s.neg];
  const colorGroups = [s.colorGroup, s.colorGroup];
  const soundGroups = [[s.pos, 0], [0, s.neg]];

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toFixed(4)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('父节点熵', entropy(parent), 1.0, 1e-9);
  check('色泽子组熵（3 位小数）', Number(entropy(s.colorGroup).toFixed(3)), s.colorEntropy, 0.0005);
  check('色泽增益（3 位小数）', Number(infoGain(parent, colorGroups).toFixed(3)), s.colorGain, 0.0005);
  check('敲声增益', infoGain(parent, soundGroups), s.soundGain, 1e-9);
  check('父节点基尼', gini(parent), s.giniParent, 1e-9);
  check('色泽子组基尼（3 位小数）', Number(gini(s.colorGroup).toFixed(3)), s.giniChild, 0.0005);
  check('基尼加权增益（3 位小数）', Number(giniGain(parent, colorGroups).toFixed(3)), s.giniGain, 0.0005);
  check('覆盖率（百分点）', (s.cover / s.totalSamples) * 100, s.coverDeclared, 0.05);
  check('精度（2 位小数）', Number((s.hit / s.cover).toFixed(2)), s.precisionDeclared, 0.005);

  return { setup: s, prune, parent, colorGroups, soundGroups, rows };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 4 章 树的好坏不在深度，在你切的那一刀问的是什么问题');
  console.log('');
  console.log(`演算设定：${s.total} 条样例、${s.pos} 正 ${s.neg} 负；父节点熵 ${entropy(r.parent)} bit，基尼 ${gini(r.parent)}`);
  console.log('');
  console.log('两刀对比：');
  console.log(`  按「色泽」：子组各 ${s.per} 条、每组 ${s.colorGroup.join(' 正 ')} 负 → 熵 ${entropy(s.colorGroup).toFixed(3)}，信息增益 ${infoGain(r.parent, r.colorGroups).toFixed(3)}`);
  console.log(`  按「敲声」：一组全正、一组全负 → 熵 0，信息增益 ${infoGain(r.parent, r.soundGroups).toFixed(1)}`);
  console.log(`  基尼口径：父 ${gini(r.parent)} → 子 ${s.giniGain.toFixed(3)} 的下降，与熵的排序一致但更省算力`);
  console.log('');
  console.log(`一条路径覆盖 ${s.cover} 条、判对 ${s.hit} 条：覆盖率 ${((s.cover / s.totalSamples) * 100).toFixed(0)}%，精度 ${(s.hit / s.cover).toFixed(2)}`);
  console.log(`剪枝对比：${r.prune.leaves} 个叶子的树训练误差 ${r.prune.treeTrain} / 验证 ${r.prune.treeVal}；`);
  console.log(`  剪成一个叶子后训练误差 ${r.prune.leafTrain} / 验证 ${r.prune.leafVal} → ${shouldPrune(r.prune) ? '应当剪' : '不该剪'}（验证误差优先）`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, parsePrune, entropy, gini, weighted, infoGain, giniGain, shouldPrune, reconcile, DOC };
