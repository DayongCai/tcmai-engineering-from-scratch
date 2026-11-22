'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, parseTable, discounted, valueIteration, fixedPoint, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('折现回报是 γ 的步数次方', () => {
  assert.ok(Math.abs(discounted(0.9, 2) - 0.81) < 1e-12);
  assert.ok(Math.abs(discounted(0.99, 2) - 0.9801) < 1e-12);
  assert.ok(discounted(0.9, 0) === 1);
});

test('γ 越接近 1，同一策略的价值越高', () => {
  assert.ok(discounted(0.99, 2) > discounted(0.9, 2));
  assert.ok(fixedPoint(0.99)[0] > fixedPoint(0.9)[0]);
});

test('值迭代逐轮复现正文的前四轮', () => {
  const h = valueIteration(0.9, 4);
  assert.deepStrictEqual(h[0], [0, 0]);
  assert.deepStrictEqual(h[1].map((v) => Number(v.toFixed(3))), [1, 0]);
  assert.deepStrictEqual(h[2].map((v) => Number(v.toFixed(3))), [1, 0.9]);
  assert.deepStrictEqual(h[3].map((v) => Number(v.toFixed(3))), [1.81, 0.9]);
  assert.deepStrictEqual(h[4].map((v) => Number(v.toFixed(3))), [1.81, 1.629]);
});

test('不动点与代数解一致', () => {
  const [v1, v2] = fixedPoint(0.9);
  assert.ok(Math.abs(v1 - 5.263157894) < 1e-9);
  assert.ok(Math.abs(v2 - 4.736842105) < 1e-9);
  assert.ok(valueIteration(0.9, 200)[200][0] > 5.26);
});

test('迭代表能解析，含不动点行', () => {
  const rows = parseTable(readDoc());
  assert.ok(rows.length >= 6);
  const last = rows[rows.length - 1];
  assert.strictEqual(last.round, Infinity);
  assert.strictEqual(last.v1, 5.263);
  assert.strictEqual(last.v2, 4.737);
});

test('收敛是几何的：每两轮误差乘以 γ²', () => {
  const h = valueIteration(0.9, 8);
  const [v1] = fixedPoint(0.9);
  const e = (k) => Math.abs(h[k][0] - v1);
  assert.ok(e(4) < e(2) && e(6) < e(4) && e(8) < e(6));
  assert.ok(Math.abs(e(6) / e(4) - 0.81) < 0.02, `两轮衰减比 ${e(6) / e(4)}`);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.gamma, 0.9);
  assert.strictEqual(s.gamma2, 0.99);
  assert.strictEqual(s.chainReturn, 0.81);
  assert.strictEqual(s.chainReturn2, 0.9801);
  assert.strictEqual(s.actions, 10);
  assert.strictEqual(s.maxBias, 0.13);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 20);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 20\/20 项通过/);
  assert.match(out, /不构成在高风险场景部署强化学习的许可/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/16-qianghua-xuexi/docs/zh.md'), '头部注释未指向本章');
});
