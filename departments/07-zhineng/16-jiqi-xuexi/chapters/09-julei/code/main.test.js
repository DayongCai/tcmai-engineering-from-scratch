'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, euclid, assign, update, silhouette, covarianceParams, randIndex, adjustedRand, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('四点 k-means 一轮就稳定，中心复现正文', () => {
  const points = [[1, 1], [2, 1], [4, 3], [5, 4]];
  const a1 = assign(points, [[1, 1], [5, 4]]);
  assert.deepStrictEqual(a1.map((x) => x.label), [0, 0, 1, 1]);
  const c1 = update(points, [0, 0, 1, 1], 2);
  assert.deepStrictEqual(c1, [[1.5, 1], [4.5, 3.5]]);
  const a2 = assign(points, c1);
  assert.deepStrictEqual(a2.map((x) => x.label), [0, 0, 1, 1]);
});

test('簇内平方和随迭代不增', () => {
  const points = [[1, 1], [2, 1], [4, 3], [5, 4]];
  const sse = (centers, labels) => points.reduce((a, p, i) => a + euclid(p, centers[labels[i]]) ** 2, 0);
  const l1 = assign(points, [[1, 1], [5, 4]]).map((x) => x.label);
  const c1 = update(points, l1, 2);
  const l2 = assign(points, c1).map((x) => x.label);
  const c2 = update(points, l2, 2);
  assert.ok(sse(c2, l2) <= sse([[1, 1], [5, 4]], l1));
});

test('轮廓系数在 [-1,1] 内，簇内更近时为负', () => {
  assert.ok(Math.abs(silhouette(1, 3) - 2 / 3) < 1e-12);
  assert.strictEqual(silhouette(2, 2), 0);
  assert.ok(silhouette(3, 1) < 0);
  assert.strictEqual(silhouette(0, 0), 0);
});

test('协方差参数是 d(d+1)/2', () => {
  assert.strictEqual(covarianceParams(20), 210);
  assert.strictEqual(covarianceParams(20) * 5, 1050);
  assert.strictEqual(covarianceParams(2), 3);
});

test('ARI 校正了随机一致，RI 没有', () => {
  assert.strictEqual(adjustedRand([0, 0, 1, 1], [0, 0, 1, 1]), 1);
  const a = [0, 0, 1, 1, 2, 2, 0, 1, 2, 0];
  const b = [1, 1, 2, 2, 0, 0, 1, 2, 0, 1];
  // 只是换名，划分相同 → ARI 仍为 1
  assert.ok(Math.abs(adjustedRand(a, b) - 1) < 1e-12);
  assert.ok(randIndex(a, b) === 1);
  const c = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
  assert.ok(Math.abs(adjustedRand(a, c)) < 0.2, `随机划分的 ARI 应接近 0，得 ${adjustedRand(a, c)}`);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.n, 200);
  assert.strictEqual(s.dims, 8);
  assert.strictEqual(s.k, 3);
  assert.deepStrictEqual(s.silhouettes, [0.52, 0.48, 0.61]);
  assert.strictEqual(s.d, 20);
  assert.strictEqual(s.perCluster, 210);
  assert.strictEqual(s.totalCov, 1050);
  assert.strictEqual(s.unstable, 0.6);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 9);
  assert.strictEqual(r.stable, true);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 9\/9 项通过/);
  assert.match(out, /不构成任何证型分类主张/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/09-julei/docs/zh.md'), '头部注释未指向本章');
});
