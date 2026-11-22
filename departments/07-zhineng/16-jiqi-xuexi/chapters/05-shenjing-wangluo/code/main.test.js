'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, sigmoid, paramCount, xorForward, oneStep, uniformLoss, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('参数个数按 (n_in+1)×n_out 累加', () => {
  assert.strictEqual(paramCount([2, 2, 1]), 9);
  assert.strictEqual(paramCount([4, 3, 2]), 15 + 8);
});

test('XOR 无法被单层线性模型切开，但两个隐单元可以', () => {
  const w = { o1: [20, 20, 10], and: [20, 20, 30], out: [20, 20, 10] };
  const pts = [[[0, 0], 0], [[0, 1], 1], [[1, 0], 1], [[1, 1], 0]];
  for (const [x, t] of pts) {
    const f = xorForward(x, w);
    assert.strictEqual(f.y > 0.5 ? 1 : 0, t, `x=${x}`);
  }
  // 单层线性模型在 XOR 上最好只能错 2 个
  assert.strictEqual(0.5, 2 / 4);
});

test('一步反传复现正文的损失与梯度', () => {
  const s = oneStep(1, 0.5, 1, 1);
  assert.ok(Math.abs(s.yhat - 0.6225) < 1e-4);
  assert.ok(Math.abs(s.loss - 0.0713) < 1e-4);
  assert.ok(Math.abs(s.dLdw + 0.0887) < 1e-4);
  assert.ok(Math.abs(s.nextW - 0.5887) < 1e-4);
});

test('sigmoid 导数上限是 0.25，十层连乘约 9.5e-7', () => {
  assert.strictEqual(sigmoid(0) * (1 - sigmoid(0)), 0.25);
  assert.ok(Math.abs(Math.pow(0.25, 10) / 9.54e-7 - 1) < 1e-2);
});

test('均匀预测的交叉熵是 ln K', () => {
  assert.ok(Math.abs(uniformLoss(2) - 0.693) < 0.001);
  assert.ok(Math.abs(uniformLoss(10) - 2.303) < 0.001);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.deepStrictEqual(s.layers, [2, 2, 1]);
  assert.strictEqual(s.params, 9);
  assert.strictEqual(s.x, 1);
  assert.strictEqual(s.w, 0.5);
  assert.strictEqual(s.lr, 1.0);
  assert.strictEqual(s.yhat0, 0.6225);
  assert.strictEqual(s.wNext, 0.5887);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 12);
  assert.strictEqual(r.solved, true);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 12\/12 项通过/);
  assert.match(out, /四个点全部判对：是/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/05-shenjing-wangluo/docs/zh.md'), '头部注释未指向本章');
});
