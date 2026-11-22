'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, pacEpsilon, requiredSamples, vcTerm, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('有限假设空间的界复现正文的 0.022', () => {
  assert.ok(Math.abs(pacEpsilon(1000, 10000, 0.05) - 0.022) < 0.001);
  assert.ok(Math.abs(pacEpsilon(1e6, 10000, 0.05) - 0.029) < 0.001);
});

test('界对 |H| 取对数：百万倍假设空间只带来 0.7 个百分点', () => {
  const a = pacEpsilon(1000, 10000, 0.05);
  const b = pacEpsilon(1e6, 10000, 0.05);
  assert.ok(b - a < 0.01);
  assert.ok(b > a);
});

test('界对 m 取平方根：样本翻四倍界才收紧一半', () => {
  const a = pacEpsilon(1000, 10000, 0.05);
  const b = pacEpsilon(1000, 40000, 0.05);
  assert.ok(Math.abs(b / a - 0.5) < 0.01);
});

test('反解样本量是界的逆运算', () => {
  const m = requiredSamples(1e4, 0.05, 0.05);
  assert.ok(Math.abs(m - 2442) < 5, `得 ${m}`);
  assert.ok(Math.abs(requiredSamples(1e4, 0.02, 0.05) - 15263) < 20);
});

test('置信度越高、假设空间越大，所需样本越多', () => {
  assert.ok(requiredSamples(1e4, 0.05, 0.01) > requiredSamples(1e4, 0.05, 0.05));
  assert.ok(requiredSamples(1e6, 0.05, 0.05) > requiredSamples(1e4, 0.05, 0.05));
});

test('VC 界项复现正文的 0.164', () => {
  assert.ok(Math.abs(vcTerm(50, 10000, 0.05) - 0.164) < 0.001);
  assert.ok(vcTerm(50, 10000, 0.05) > 0.03 * 3, '界应远大于实测差距');
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.h, 1000);
  assert.strictEqual(s.m, 10000);
  assert.strictEqual(s.eps, 0.022);
  assert.strictEqual(s.epsLarge, 0.029);
  assert.strictEqual(s.dvc, 50);
  assert.strictEqual(s.vcTermDeclared, 0.164);
  assert.strictEqual(s.vcGap, 3);
  assert.strictEqual(s.mDeclared, 2442);
  assert.strictEqual(s.mWide, 9340);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 6);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 6\/6 项通过/);
  assert.match(out, /不得作为临床部署依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/12-jisuan-xuexi-lilun/docs/zh.md'), '头部注释未指向本章');
});
