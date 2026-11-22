'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, hypothesisSpace, stderr, halfWidth95, nForHalfWidth, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

test('假设空间规模按合取式公式现算', () => {
  assert.strictEqual(hypothesisSpace(3, 2), 28);
  assert.strictEqual(hypothesisSpace(1, 2), 4);
  assert.strictEqual(hypothesisSpace(4, 2), 82);
});

test('标准误随样本量按平方根缩小', () => {
  const s100 = stderr(0.1, 100);
  const s400 = stderr(0.1, 400);
  assert.ok(Math.abs(s100 - 0.03) < 1e-9);
  assert.ok(Math.abs(s400 - s100 / 2) < 1e-12);
});

test('演算设定能从正文读出，且不是默认值', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.attrs, 3);
  assert.strictEqual(s.values, 2);
  assert.strictEqual(s.train, 8);
  assert.strictEqual(s.p, 0.1);
  assert.strictEqual(s.n, 100);
});

test('正文三个数字与现算一致', () => {
  const r = reconcile(readDoc());
  assert.strictEqual(r.setup.declared.hypotheses, 28);
  assert.strictEqual(r.setup.declared.sigma, 0.03);
  assert.deepStrictEqual(r.rows.map((x) => x.ok), [true, true, true]);
});

test('95% 半宽在 5.5–6.5 个百分点之间', () => {
  const h = halfWidth95(0.1, 100);
  assert.ok(h * 100 > 5.5 && h * 100 < 6.5, `半宽 ${h * 100}`);
});

test('压到 ±2 个百分点所需样本量约为 100 的八到十倍', () => {
  const n = nForHalfWidth(0.1, 0.02);
  const ratio = n / 100;
  assert.ok(ratio > 8 && ratio < 10, `倍数 ${ratio}`);
});

test('正文缺失时抛错，不退回默认值', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账/);
  assert.match(out, /假设空间规模：现算 28 \/ 正文 28/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/01-xulun/docs/zh.md'), '头部注释未指向本章');
});
