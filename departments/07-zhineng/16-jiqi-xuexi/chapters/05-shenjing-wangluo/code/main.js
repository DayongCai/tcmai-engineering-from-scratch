#!/usr/bin/env node
/**
 * 机器学习 · 第 5 章 深度不是层数，是每层都在换一次坐标
 * 课程: departments/07-zhineng/16-jiqi-xuexi/chapters/05-shenjing-wangluo/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本脚本从正文读出 2-2-1 结构、XOR 的两个隐单元权重、单隐单元反传的初值，
 * 重算参数个数、四点前向结果、一步反传后的损失，并与正文对账。
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

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** 全连接层参数个数：每层 (n_in+1)×n_out */
function paramCount(layers) {
  let total = 0;
  for (let i = 0; i + 1 < layers.length; i += 1) total += (layers[i] + 1) * layers[i + 1];
  return total;
}

/** XOR 的 2-2-1 前向：两个隐单元近似「或」与「与」，输出取「或且非与」 */
function xorForward(x, w) {
  const h1 = sigmoid(w.o1[0] * x[0] + w.o1[1] * x[1] - w.o1[2]);
  const h2 = sigmoid(w.and[0] * x[0] + w.and[1] * x[1] - w.and[2]);
  const y = sigmoid(w.out[0] * h1 - w.out[1] * h2 - w.out[2]);
  return { h1, h2, y };
}

/** 单个 sigmoid 单元 + 平方损失的一步反传 */
function oneStep(x, w, y, lr) {
  const z = w * x;
  const yhat = sigmoid(z);
  const loss = 0.5 * (yhat - y) ** 2;
  const dLdy = yhat - y;
  const dsig = yhat * (1 - yhat);
  const dLdz = dLdy * dsig;
  const dLdw = dLdz * x;
  return { z, yhat, loss, dLdy, dsig, dLdz, dLdw, nextW: w - lr * dLdw };
}

/** K 分类在均匀预测下的交叉熵 */
const uniformLoss = (k) => Math.log(k);

function parseSetup(doc) {
  const net = doc.match(/(\d+)-(\d+)-(\d+)\s*的网络，总共\s*(\d+)\s*个参数/);
  if (!net) throw new Error('正文里没找到网络结构设定');
  const or1 = doc.match(/h_1=\\sigma\((\d+)x_1\+(\d+)x_2-(\d+)\)/);
  const and2 = doc.match(/h_2=\\sigma\((\d+)x_1\+(\d+)x_2-(\d+)\)/);
  const out = doc.match(/y=\\sigma\((\d+)h_1-(\d+)h_2-(\d+)\)/);
  if (!or1 || !and2 || !out) throw new Error('正文里没找到隐单元权重设定');
  return {
    layers: [Number(net[1]), Number(net[2]), Number(net[3])],
    params: Number(net[4]),
    weights: { o1: or1.slice(1, 4).map(Number), and: and2.slice(1, 4).map(Number), out: out.slice(1, 4).map(Number) },
    x: needNum(doc, /：\$x=(\d+)\$、\$w=/, '输入 x'),
    w: needNum(doc, /：\$x=\d+\$、\$w=([\d.]+)\$/, '权重 w'),
    y: needNum(doc, /目标\s*\$y=(\d+)\$/, '目标 y'),
    lr: needNum(doc, /取学习率\s*([\d.]+)/, '学习率'),
    yhat0: needNum(doc, /\\hat\{y\}=\\sigma\(0\.5\)=([\d.]+)\$/, '初始输出'),
    loss0: needNum(doc, /L=\\tfrac12\([\d.]+-1\)\^2=([\d.]+)\$/, '初始损失'),
    grad: needNum(doc, /\\partial L\/\\partial w=-[\d.]+\\times1=(-[\d.]+)\$/, '梯度'),
    wNext: needNum(doc, /取学习率 1\.0，\$w\$ 更新为\s*\$?([\d.]+)/, '更新后的权重'),
    yhat1: needNum(doc, /下一轮前向\s*\$\\hat\{y\}=\\sigma\([\d.]+\)=([\d.]+)\$/, '第二步输出'),
    loss1: needNum(doc, /L=([\d.]+)\$——降了/, '第二步损失'),
    decay: needNum(doc, /\$0\.25\^\{10\}\\approx([\d.]+)\\times10\^\{-7\}/, '十层后的梯度'),
    satDeriv: needNum(doc, /时导数小于\s*([\d.]+)/, '饱和区导数上限'),
    netAcc: needNum(doc, /一个 5 层网络在测试集上\s*([\d.]+)/, '深层网络准确率'),
    lrAcc: needNum(doc, /同一份数据上逻辑回归\s*([\d.]+)/, '逻辑回归准确率'),
  };
}

function reconcile(doc) {
  const s = parseSetup(doc);
  const points = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];
  const forward = points.map(([a, b, t]) => ({ x: [a, b], target: t, ...xorForward([a, b], s.weights) }));

  const step = oneStep(s.x, s.w, s.y, s.lr);
  const second = oneStep(s.x, step.nextW, s.y, s.lr);

  const rows = [];
  const check = (label, computed, declared, tol) => {
    const ok = Math.abs(computed - declared) <= tol;
    rows.push({ label, computed: Number(computed.toPrecision(6)), declared, ok });
    if (!ok) throw new Error(`${label} 对不上：现算 ${computed}，正文写 ${declared}`);
  };

  check('参数个数', paramCount(s.layers), s.params, 0);
  check('初始输出（4 位小数）', Number(step.yhat.toFixed(4)), s.yhat0, 0.0001);
  check('初始损失（4 位小数）', Number(step.loss.toFixed(4)), s.loss0, 0.0001);
  check('反传梯度（4 位小数）', Number(step.dLdw.toFixed(4)), s.grad, 0.0001);
  check('更新后的权重（4 位小数）', Number(step.nextW.toFixed(4)), s.wNext, 0.0001);
  check('第二步输出（3 位小数）', Number(second.yhat.toFixed(3)), s.yhat1, 0.0005);
  check('第二步损失（4 位小数）', Number(second.loss.toFixed(4)), s.loss1, 0.0002);
  check('十层后的梯度（数量级）', Number((Math.pow(0.25, 10) / 1e-7).toFixed(1)), s.decay, 0.06);
  check('饱和区导数上限', sigmoid(4) * (1 - sigmoid(4)), s.satDeriv, 0.001);
  check('均匀预测的交叉熵（二分类）', Number(uniformLoss(2).toFixed(3)), 0.693, 0.0005);
  check('均匀预测的交叉熵（十分类）', Number(uniformLoss(10).toFixed(3)), 2.303, 0.0005);
  check('准确率差距（百分点）', Number(((s.netAcc - s.lrAcc) * 100).toFixed(0)), 7, 0.5);

  const solved = forward.every((p) => (p.y > 0.5 ? 1 : 0) === p.target);
  if (!solved) throw new Error('XOR 四点未被正文给出的权重切开：' + JSON.stringify(forward));

  return { setup: s, forward, step, second, rows, solved };
}

function main() {
  const doc = readDoc();
  const r = reconcile(doc);
  const s = r.setup;

  console.log('机器学习 · 第 5 章 深度不是层数，是每层都在换一次坐标');
  console.log('');
  console.log(`${s.layers.join('-')} 结构：参数 ${paramCount(s.layers)} 个（每层 (n_in+1)×n_out）`);
  console.log('');
  console.log('XOR 四点，正文给出的两个隐单元权重：');
  for (const p of r.forward) {
    console.log(`  x=(${p.x.join(',')}) → h1=${p.h1.toFixed(3)} h2=${p.h2.toFixed(3)} y=${p.y.toFixed(3)} 目标=${p.target} ${(p.y > 0.5 ? 1 : 0) === p.target ? '✓' : '✗'}`);
  }
  console.log(`  四个点全部判对：${r.solved ? '是' : '否'}（单层感知机在这四点上最好也只能错 2 个，误差 0.5）`);
  console.log('');
  console.log('单隐单元一步反传：');
  console.log(`  前向 y=${r.step.yhat.toFixed(4)}，L=${r.step.loss.toFixed(4)}`);
  console.log(`  反传 ∂L/∂y=${r.step.dLdy.toFixed(4)}，σ'=${r.step.dsig.toFixed(3)}，∂L/∂w=${r.step.dLdw.toFixed(4)}`);
  console.log(`  学习率 ${s.lr} → w=${s.w} 变 ${r.step.nextW.toFixed(4)}，下一轮 L=${r.second.loss.toFixed(4)}`);
  console.log('');
  console.log(`σ' 上限 ${(0.25).toFixed(2)}；十层连乘 ≈ ${Math.pow(0.25, 10).toExponential(2)}，梯度到第一层已消失`);
  console.log(`均匀预测的交叉熵：二分类 ${uniformLoss(2).toFixed(3)}、十分类 ${uniformLoss(10).toFixed(3)}`);
  console.log(`与正文对账 ${r.rows.filter((x) => x.ok).length}/${r.rows.length} 项通过。`);
  console.log('');
  console.log('※ 数值由正文演算设定现算，不手打；正文改版后重跑即可发现不一致。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parseSetup, sigmoid, paramCount, xorForward, oneStep, uniformLoss, reconcile, DOC };
