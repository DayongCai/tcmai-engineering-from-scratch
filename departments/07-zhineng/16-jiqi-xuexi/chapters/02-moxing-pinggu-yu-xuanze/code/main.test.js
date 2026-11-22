'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, parseCandidatesTable, stderr, optimismPoints, mcnemarChi2, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('标准误按 √(p(1-p)/n) 现算', () => {
  assert.ok(Math.abs(stderr(0.86, 1000) - 0.010972) < 1e-6);
  assert.ok(Math.abs(stderr(0.86, 200) - 0.02454) < 1e-4);
});

test('28 例的零假设检验统计量按四格表算', () => {
  assert.ok(Math.abs(mcnemarChi2(45, 28) - 3.5068) < 1e-3);
  assert.strictEqual(mcnemarChi2(10, 10), 1 / 20);
});

test('两个不一致格差得越多，统计量越大', () => {
  assert.ok(mcnemarChi2(60, 20) > mcnemarChi2(45, 28));
  assert.ok(mcnemarChi2(45, 28) > mcnemarChi2(40, 35));
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.n, 1000);
  assert.strictEqual(s.acc, 0.86);
  assert.strictEqual(s.sigma, 0.011);
  assert.strictEqual(s.sigma200, 0.025);
  assert.strictEqual(s.candidates, 40);
  assert.strictEqual(s.optimistic, 0.882);
  assert.strictEqual(s.zQuoted, 2.0);
  assert.strictEqual(s.n10, 45);
  assert.strictEqual(s.n01, 28);
  assert.strictEqual(s.chi2, 3.51);
  assert.strictEqual(s.threshold, 3.84);
});

test('候选表四行都能解析，且候选数递增', () => {
  const rows = parseCandidatesTable(readDoc());
  assert.deepStrictEqual(rows.map((r) => r.k), [1, 10, 40, 200]);
  assert.deepStrictEqual(rows.map((r) => r.z), [0, 1.54, 2.01, 2.75]);
});

test('候选表的乐观量与它自己的最大值期望自洽', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
});

test('验证集越大，同一候选数的乐观量越小', () => {
  const a = optimismPoints(2.01, 0.86, 1000);
  const b = optimismPoints(2.01, 0.86, 200);
  assert.ok(b > 2 * a, `200 例 ${b} 应远大于 1,000 例 ${a}`);
});

test('1.7 个标准误的差距未过显著性门', () => {
  const s = parseSetup(readDoc());
  const gap = 0.871 - 0.852;
  const z = gap / stderr(s.acc, s.n);
  assert.ok(z > 1.5 && z < 2.0, `z=${z}`);
  assert.ok(mcnemarChi2(s.n10, s.n01) < s.threshold);
});

test('正文设定缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
  assert.throws(() => parseCandidatesTable('| 1 | 0 |'), /少于/);
});

test('脚本可运行且输出对账结果', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 12\/12 格通过/);
  assert.match(out, /未达显著/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/02-moxing-pinggu-yu-xuanze/docs/zh.md'), '头部注释未指向本章');
});
