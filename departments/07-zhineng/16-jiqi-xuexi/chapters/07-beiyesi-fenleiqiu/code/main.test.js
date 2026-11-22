'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, jointSpace, nbParams, posterior, smoothed, reweightPosterior, gauss, responsibility, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('联合空间是指数级，一维计数是线性级', () => {
  assert.strictEqual(jointSpace(14, 3), 4782969);
  assert.strictEqual(nbParams(2, 14, 3), 84);
  assert.ok(jointSpace(14, 3) / nbParams(2, 14, 3) > 50000);
});

test('后验按先验×似然归一', () => {
  const p = posterior(0.5, 0.8 * 0.9 * 0.9, 0.5, 0.2 * 0.1 * 0.1);
  assert.ok(Math.abs(p - 0.99692) < 1e-4);
  assert.strictEqual(posterior(0.5, 1, 0.5, 0), 1);
  assert.strictEqual(posterior(0.5, 1, 0.5, 1), 0.5);
});

test('平滑把零概率抬到非零', () => {
  assert.strictEqual(smoothed(0, 10, 2, 1), 1 / 12);
  assert.ok(smoothed(0, 10, 2, 1) > 0 && smoothed(0, 10, 2, 1) < 0.1);
  assert.ok(smoothed(0, 10000, 2, 1) < 0.001, '样本大时平滑的影响应当可忽略');
});

test('跨场景先验换算：同一份证据，结论随先验改变', () => {
  const p = reweightPosterior(0.9, 0.3, 0.02);
  assert.ok(Math.abs(p - 0.30) < 0.005);
  assert.ok(p < 0.9);
  // 换回原先验应当回到原后验
  assert.ok(Math.abs(reweightPosterior(p, 0.02, 0.3) - 0.9) < 1e-9);
});

test('高斯密度与责任度', () => {
  assert.ok(Math.abs(gauss(2, 0, 1) - 0.05399) < 1e-4);
  const r = responsibility(2, [{ prior: 0.5, mu: 0, sigma: 1 }, { prior: 0.5, mu: 4, sigma: 1 }]);
  assert.strictEqual(r[0], 0.5);
  assert.ok(Math.abs(r[0] + r[1] - 1) < 1e-12);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.dims, 14);
  assert.strictEqual(s.values, 3);
  assert.strictEqual(s.classes, 2);
  assert.strictEqual(s.declaredJointWan, 478);
  assert.strictEqual(s.declaredParams, 84);
  assert.strictEqual(s.post, 0.997);
  assert.strictEqual(s.smoothedDeclared, 0.083);
  assert.strictEqual(s.piOld, 0.3);
  assert.strictEqual(s.piNew, 0.02);
  assert.strictEqual(s.postNew, 0.3);
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
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/07-beiyesi-fenleiqiu/docs/zh.md'), '头部注释未指向本章');
});
