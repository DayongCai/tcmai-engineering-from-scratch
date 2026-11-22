'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, norm, signedDistance, geometricMargin, rbf, hinge, logisticLoss, marginBound, solveTwoPoints, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('两点对称设定解出 w=1、b=0，间隔为 2', () => {
  const fit = solveTwoPoints([1, 0], 1, [-1, 0], -1);
  assert.strictEqual(fit.w[0], 1);
  assert.strictEqual(fit.b, 0);
  assert.strictEqual(norm(fit.w), 1);
  assert.strictEqual(geometricMargin(fit.w), 2);
});

test('支持向量恰好压在间隔边界上', () => {
  const fit = solveTwoPoints([1, 0], 1, [-1, 0], -1);
  assert.strictEqual(Math.abs(signedDistance(fit.w, fit.b, [1, 0])), 1);
  assert.strictEqual(Math.abs(signedDistance(fit.w, fit.b, [-1, 0])), 1);
});

test('几何距离对 w 与 b 的整体缩放不变', () => {
  const a = signedDistance([1], 0, [1]);
  const b = signedDistance([10], 0, [1]);
  assert.strictEqual(a, b);
  // 间隔公式 2/‖w‖ 只在函数间隔规范到 1 后成立，所以它与 ‖w‖ 成反比
  assert.strictEqual(geometricMargin([2]), 1);
  assert.ok(geometricMargin([2]) < geometricMargin([1]));
});

test('合页损失对远处样本给零梯度，Logistic 不给', () => {
  assert.ok(Math.abs(hinge(0.6) - 0.4) < 1e-12);
  assert.strictEqual(hinge(1.4), 0);
  assert.ok(logisticLoss(1.4) > 0.2 && logisticLoss(1.4) < 0.24);
  assert.ok(hinge(1.4) < logisticLoss(1.4));
});

test('RBF 核随距离单调衰减', () => {
  assert.strictEqual(rbf([0, 0], [0, 0], 0.5), 1);
  assert.ok(Math.abs(rbf([1, 0], [0, 0], 0.5) - 0.607) < 0.001);
  assert.ok(Math.abs(rbf([2, 0], [0, 0], 0.5) - 0.135) < 0.001);
  assert.ok(rbf([2, 0], [0, 0], 1) < rbf([2, 0], [0, 0], 0.5));
});

test('间隔界随 ρ 平方倒数增长', () => {
  const half = marginBound(1, 0.5, 1000);
  const tight = marginBound(1, 0.1, 1000);
  assert.ok(Math.abs(half - 0.0632) < 1e-3);
  assert.ok(Math.abs(tight / half - 5) < 1e-6);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.deepStrictEqual(s.p1.x, [1, 0]);
  assert.strictEqual(s.p1.y, 1);
  assert.deepStrictEqual(s.p2.x, [-1, 0]);
  assert.strictEqual(s.p2.y, -1);
  assert.strictEqual(s.margin, 2);
  assert.strictEqual(s.gamma, 0.5);
  assert.strictEqual(s.k1, 0.607);
  assert.strictEqual(s.kFar, 0.135);
  assert.strictEqual(s.svLo, 30);
  assert.strictEqual(s.svHi, 80);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 11);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 11\/11 项通过/);
  assert.match(out, /距离 2 时 0.135/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/06-zhichi-xiangliang-ji/docs/zh.md'), '头部注释未指向本章');
});
