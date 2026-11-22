#!/usr/bin/env node
/**
 * 第 2 章 深层网络不是更聪明，是把误差分配得更细 —— 确定性测试
 * 运行: node --test（在本章目录下）
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  sigmoid,
  step,
  parseNeuron,
  parseWorkedExample,
  parseScale,
  parseParamCap,
  parseAccuracyReport,
  ci95,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，含算例与代价节', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  assert.ok(doc.includes('反向传播'));
  assert.ok(doc.includes('代价与边界'));
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('sigmoid 的边界性质：σ(0)=0.5、关于原点互补、极大负值不溢出', () => {
  assert.strictEqual(sigmoid(0), 0.5);
  for (const z of [0.4, 1.3, 4]) near(sigmoid(z) + sigmoid(-z), 1, 1e-12, '互补性');
  assert.ok(Number.isFinite(sigmoid(-800)));
  assert.ok(sigmoid(-800) >= 0 && sigmoid(-800) < 1e-20);
});

test('正文算例设定能原样读出：w=0.5、x=2、y=1、η=0.1', () => {
  const n = parseNeuron(doc);
  assert.deepStrictEqual(n, { w: 0.5, b: 0, x: 2, y: 1, eta: 0.1 });
});

test('一次前向复算到正文给出的位数：a≈0.731、L≈0.0362', () => {
  const s = step(parseNeuron(doc));
  near(s.a, 0.731, 5e-4, '激活值');
  near(s.loss, 0.0362, 5e-5, '平方损失');
  assert.ok(doc.includes('0.731') && doc.includes('0.0362'), '正文没写这两个数');
});

test('反向三因子齐：δ = (a−y)·a(1−a)，且与正文 0.0527 同量级同符号', () => {
  const n = parseNeuron(doc);
  const s = step(n);
  near(s.delta, (s.a - n.y) * s.a * (1 - s.a), 1e-12, 'δ 定义');
  assert.ok(s.delta < 0, 'δ 应为负（a 低于真值）');
  near(Math.abs(s.delta), 0.0527, 5e-4, 'δ 绝对值');
  near(s.dAct, 0.196, 2e-3, '激活导数');
  assert.ok(doc.includes('0.0527'));
});

test('更新后的权重 0.5105 可由 δ·x 复算，且方向朝真值', () => {
  const n = parseNeuron(doc);
  const s = step(n);
  near(s.w2, 0.5105, 2e-3, '更新后权重');
  assert.ok(s.w2 > n.w, '更新应把 w 推大（缩小误差）');
  assert.ok(doc.includes('0.5105'));
});

test('x=0 时梯度为零：稀疏输入学得慢是算术结果，不是玄学', () => {
  const base = parseNeuron(doc);
  const s = step({ ...base, x: 0 });
  assert.ok(s.gradW === 0, `梯度应为 0，实得 ${s.gradW}`);
  assert.strictEqual(s.w2, base.w);
});

test('正文四条 bullet 里的近似值可原样读出，且与现算一致到千分位', () => {
  const ex = parseWorkedExample(doc);
  const s = step(parseNeuron(doc));
  near(s.a, ex.a, 5e-4, '前向');
  near(s.loss, ex.loss, 5e-5, '损失');
  near(s.delta, ex.delta, 5e-4, '梯度');
  near(s.w2, ex.w, 2e-3, '更新后权重');
});

test('参数／样本比复算到正文的 0.00016，且经验线上限为 60', () => {
  const scale = parseScale(doc);
  assert.strictEqual(scale.samples, 600);
  assert.strictEqual(scale.params, 3700000);
  assert.strictEqual((scale.samples / scale.params).toFixed(5), '0.00016');
  const div = parseParamCap(doc);
  assert.strictEqual(div, 10);
  assert.strictEqual(scale.samples / div, 60);
  assert.ok(doc.includes('0.00016'), '正文没写每个参数分到多少样本');
});

test('置信区间半宽复算约 0.03，且区间宽到能吞掉 5 个点', () => {
  const rep = parseAccuracyReport(doc);
  assert.strictEqual(rep.n, 600);
  near(rep.acc, 0.85, 1e-9, '正文准确率');
  const half = ci95(rep.acc, rep.n);
  near(half, rep.quoted, 2e-3, '区间半宽');
  assert.ok(2 * half > 0.05, `区间全宽 ${2 * half} 应大于 0.82 与 0.87 的差`);
});

test('脚本不写死算例结果：0.0362 只能算出来', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/0\.0362/.test(src), '源码写死了损失值');
  assert.ok(!/0\.5105/.test(src), '源码写死了更新后权重');
});

test('脚本可运行，输出含三块现算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /现读现算/);
  assert.match(out, /可训练参数上限 60 个/);
  assert.match(out, /不构成技术选型或临床判断依据/);
});
