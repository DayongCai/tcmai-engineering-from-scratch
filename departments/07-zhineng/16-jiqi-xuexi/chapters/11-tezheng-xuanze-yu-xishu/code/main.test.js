'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, softThreshold, ridgeShrink, l1Vertices, l1ZerosPerVertex, jaccard, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('软阈值减一个常数，岭回归除以一个常数', () => {
  assert.ok(Math.abs(softThreshold(0.3, 40, 100) - 0.1) < 1e-12);
  assert.strictEqual(softThreshold(0.05, 40, 100), 0);
  assert.ok(Math.abs(ridgeShrink(0.3, 40, 100) - 0.3 / 1.4) < 1e-12);
  assert.ok(ridgeShrink(0.05, 40, 100) > 0, '岭回归永不为零');
});

test('软阈值保号且单调', () => {
  assert.ok(softThreshold(-1.2, 40, 100) < 0);
  assert.ok(softThreshold(1.2, 40, 100) > softThreshold(0.8, 40, 100));
  assert.strictEqual(softThreshold(0.2, 40, 100), 0);
});

test('L1 球的顶点数随维度线性增长', () => {
  assert.strictEqual(l1Vertices(2), 4);
  assert.strictEqual(l1Vertices(1000), 2000);
  assert.strictEqual(l1ZerosPerVertex(1000), 999);
  assert.strictEqual(l1Vertices(2) * l1ZerosPerVertex(2), 4);
});

test('Jaccard 相似度', () => {
  assert.strictEqual(jaccard(['a', 'b'], ['a', 'b']), 1);
  assert.strictEqual(jaccard(['a', 'b'], ['b', 'c']), 1 / 3);
  assert.strictEqual(jaccard([], []), 1);
  assert.strictEqual(jaccard(['a'], []), 0);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.p, 1000);
  assert.strictEqual(s.n, 200);
  assert.strictEqual(s.errTestFull, 0.68);
  assert.strictEqual(s.kept, 12);
  assert.strictEqual(s.errTestSparse, 0.31);
  assert.strictEqual(s.m, 100);
  assert.strictEqual(s.lambda, 40);
  assert.deepStrictEqual(s.ols, [1.2, 0.8, 0.3, -0.05, 0.02]);
  assert.strictEqual(s.thresholdDeclared, 0.2);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 9);
  assert.deepStrictEqual(r.sparse.map((v) => Number(v.toFixed(2))), [1, 0.6, 0.1, 0, 0]);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 9\/9 项通过/);
  assert.match(out, /不得解释为病因或疗效因子/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/11-tezheng-xuanze-yu-xishu/docs/zh.md'), '头部注释未指向本章');
});
