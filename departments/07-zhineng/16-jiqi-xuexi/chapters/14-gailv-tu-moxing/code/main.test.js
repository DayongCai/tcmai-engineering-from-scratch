'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, jointParams, chainParams, forward, veCost, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('链式分解把指数级参数降到线性', () => {
  assert.strictEqual(jointParams(20), 1048576);
  assert.strictEqual(chainParams(20), 77);
  assert.strictEqual(jointParams(2), 4);
  assert.strictEqual(chainParams(2), 5);
});

test('前向算法复现正文的 0.1244', () => {
  const pi = [0.6, 0.4];
  const A = [[0.7, 0.3], [0.4, 0.6]];
  const B = [[0.5, 0.5], [0.1, 0.9]];
  const alpha = forward(pi, A, B, [0, 0]);
  assert.deepStrictEqual(alpha[0].map((v) => Number(v.toFixed(2))), [0.3, 0.04]);
  assert.deepStrictEqual(alpha[1].map((v) => Number(v.toFixed(4))), [0.113, 0.0114]);
  assert.ok(Math.abs(alpha[1][0] + alpha[1][1] - 0.1244) < 1e-4);
});

test('序列概率等于所有末态概率之和', () => {
  const pi = [0.5, 0.5];
  const A = [[1, 0], [0, 1]];
  const B = [[1, 0], [0, 1]];
  const alpha = forward(pi, A, B, [0, 1]);
  assert.strictEqual(alpha[1].reduce((a, b) => a + b, 0), 0);
});

test('树宽决定推断量级', () => {
  assert.strictEqual(veCost(1000, 2, 1), 4000);
  assert.ok(veCost(20, 2, 19) > 1e7);
  assert.ok(veCost(1000, 2, 1) < veCost(20, 2, 19));
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.d, 20);
  assert.strictEqual(s.chainTotal, 77);
  assert.strictEqual(s.chainShells, 19);
  assert.strictEqual(s.jointDeclaredWan, 105);
  assert.deepStrictEqual(s.pi, [0.6, 0.4]);
  assert.deepStrictEqual(s.A, [[0.7, 0.3], [0.4, 0.6]]);
  assert.strictEqual(s.totalDeclared, 0.1244);
  assert.strictEqual(s.chainW, 1);
  assert.strictEqual(s.denseW, 19);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 8);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 8\/8 项通过/);
  assert.match(out, /不得解释为因果机制/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/14-gailv-tu-moxing/docs/zh.md'), '头部注释未指向本章');
});
