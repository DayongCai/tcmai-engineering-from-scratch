'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, propagate, purity, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('标签传播在四点上收敛到 0.6 与 0.2', () => {
  const f = propagate([0, 1, 2, 3], [[0, 1, 1], [0, 2, 1], [1, 2, 1], [2, 3, 1]], { 0: 1, 3: -1 });
  assert.ok(Math.abs(f[1] - 0.6) < 1e-6);
  assert.ok(Math.abs(f[2] - 0.2) < 1e-6);
  assert.strictEqual(f[0], 1);
  assert.strictEqual(f[3], -1);
});

test('标注点的值不被更新', () => {
  const f = propagate([0, 1], [[0, 1, 1]], { 0: 1 });
  assert.strictEqual(f[0], 1);
  assert.ok(Math.abs(f[1] - 1) < 1e-9);
});

test('两个标注点等权时中点取均值', () => {
  const f = propagate([0, 1, 2], [[0, 1, 1], [1, 2, 1]], { 0: 1, 2: -1 });
  assert.ok(Math.abs(f[1]) < 1e-9);
});

test('纯度计算忽略未标注样本', () => {
  const clusterOf = { 0: 'a', 1: 'a', 2: 'b' };
  assert.strictEqual(purity(clusterOf, { 0: 1, 1: 1 }), 1);
  assert.strictEqual(purity(clusterOf, { 0: 1, 1: 0 }), 0.5);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.labeled, 100);
  assert.strictEqual(s.unlabeled, 9900);
  assert.strictEqual(s.accBase, 0.62);
  assert.strictEqual(s.accSelf, 0.79);
  assert.strictEqual(s.accShift, 0.48);
  assert.strictEqual(s.f2, 0.6);
  assert.strictEqual(s.f3, 0.2);
  assert.strictEqual(s.threshold, 0.9);
  assert.strictEqual(s.selected, 30);
  assert.strictEqual(s.purityDeclared, 0.58);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 5);
  assert.ok(Math.abs(r.mislabelShare - 0.03) < 1e-9);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 5\/5 项通过/);
  assert.match(out, /独立标注集验证/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/13-banyou-jian-xuexi/docs/zh.md'), '头部注释未指向本章');
});
