'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, parsePoints, leastSquares, logisticStep, sigmoid, softmax, splineBasis, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('三点最小二乘复现正文系数与残差', () => {
  const fit = leastSquares([[1, 1], [2, 3], [3, 4]]);
  assert.strictEqual(fit.w, 1.5);
  assert.ok(Math.abs(fit.b + 1 / 3) < 1e-12);
  assert.ok(Math.abs(fit.rss - 1 / 6) < 1e-12);
  assert.deepStrictEqual(fit.pred.map((v) => Number(v.toFixed(3))), [1.167, 2.667, 4.167]);
});

test('三点表从正文读出，不是写死', () => {
  assert.deepStrictEqual(parsePoints(readDoc()), [[1, 1], [2, 3], [3, 4]]);
});

test('残差与列空间正交：残差和为零', () => {
  const fit = leastSquares([[1, 1], [2, 3], [3, 4]]);
  assert.ok(Math.abs(fit.resid.reduce((a, b) => a + b, 0)) < 1e-12);
});

test('sigmoid 与交叉熵', () => {
  assert.ok(Math.abs(sigmoid(-0.5) - 0.37754) < 1e-5);
  const s = logisticStep([1, 2], [0.5, -0.5], 0, 1, 0.5);
  assert.ok(Math.abs(s.loss - 0.974) < 0.001);
  assert.ok(Math.abs(s.grad[0] + 0.6224) < 1e-3);
});

test('梯度大小随预测误差增大', () => {
  const good = logisticStep([1, 2], [2, 2], 0, 1, 0.5);
  const bad = logisticStep([1, 2], [0.5, -0.5], 0, 1, 0.5);
  assert.ok(Math.abs(bad.grad[0]) > Math.abs(good.grad[0]));
});

test('softmax 归一且保序', () => {
  const p = softmax([2, 1, 0]);
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.ok(p[0] > p[1] && p[1] > p[2]);
  assert.ok(Math.abs(p[0] - 0.665) < 0.001);
  const hot = softmax([20, 10, 0]);
  assert.ok(hot[0] > 0.999);
});

test('样条基函数个数 = 节点数 + 次数 − 1', () => {
  assert.strictEqual(splineBasis(5, 3), 7);
  assert.strictEqual(splineBasis(3, 1), 3);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok));
  assert.strictEqual(r.rows.length, 15);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 15\/15 项通过/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/03-xianxing-moxing/docs/zh.md'), '头部注释未指向本章');
});
