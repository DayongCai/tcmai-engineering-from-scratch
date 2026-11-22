'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, distMean, relSpread, coreVolume, eig2, matVec, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('距离均值按根号 d/6 增长，标准差与 d 无关', () => {
  assert.ok(Math.abs(distMean(20) - 1.826) < 0.002);
  assert.ok(Math.abs(distMean(1000) - 12.91) < 0.01);
  assert.ok(relSpread(1000) < relSpread(20));
});

test('相对波动按 1/根号 d 缩小', () => {
  const ratio = relSpread(1000) / relSpread(20);
  assert.ok(Math.abs(ratio - Math.sqrt(20 / 1000)) < 1e-12);
});

test('高维体积几乎都在外壳', () => {
  assert.ok(Math.abs(coreVolume(20, 0.1) - 0.1216) < 0.001);
  assert.ok(coreVolume(20, 0.1) < 0.15);
  assert.ok(coreVolume(1, 0.1) === 0.9);
});

test('协方差矩阵特征值是 3 与 1', () => {
  assert.deepStrictEqual(eig2(2, 1, 2), [3, 1]);
  assert.deepStrictEqual(eig2(1, 0, 1), [1, 1]);
});

test('主方向满足 Σw = λw', () => {
  const v = [1 / Math.SQRT2, 1 / Math.SQRT2];
  assert.deepStrictEqual(matVec([[2, 1], [1, 2]], v).map((x) => Number(x.toFixed(12))), [Number((3 * v[0]).toFixed(12)), Number((3 * v[1]).toFixed(12))]);
});

test('解释方差比与重构误差互补', () => {
  const [l1, l2] = eig2(2, 1, 2);
  assert.strictEqual(l1 / (l1 + l2), 0.75);
  assert.strictEqual(l2 / (l1 + l2), 0.25);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.d, 20);
  assert.strictEqual(s.m, 500);
  assert.strictEqual(s.accFull, 0.71);
  assert.strictEqual(s.acc10, 0.79);
  assert.strictEqual(s.acc3, 0.77);
  assert.strictEqual(s.mean20, 1.83);
  assert.strictEqual(s.mean1000, 12.9);
  assert.strictEqual(s.rel20, 7.6);
  assert.strictEqual(s.rel1000, 1.1);
  assert.strictEqual(s.explained, 75);
  assert.strictEqual(s.lambda2, 1);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 11);
  assert.strictEqual(r.noiseWins, true);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 11\/11 项通过/);
  assert.match(out, /不得解释为生理指标/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/10-jiangwei-yu-duliang/docs/zh.md'), '头部注释未指向本章');
});
