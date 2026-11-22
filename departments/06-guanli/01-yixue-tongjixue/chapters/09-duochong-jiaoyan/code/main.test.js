'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, parsePValues, bonferroni, holm, bh, familyError, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/09-duochong-jiaoyan/docs/zh.md'));
});

test('10 个 p 值从正文读出且升序', () => {
  const ps = parsePValues(readDoc());
  assert.strictEqual(ps.length, 10);
  for (let i = 1; i < ps.length; i += 1) assert.ok(ps[i] >= ps[i - 1]);
});

test('Bonferroni 与 Holm 各保留 1 个', () => {
  const ps = parsePValues(readDoc());
  assert.deepStrictEqual(bonferroni(ps), [0]);
  assert.deepStrictEqual(holm(ps), [0]);
});

test('BH 保留前 2 个（0.001 与 0.008）', () => {
  const ps = parsePValues(readDoc());
  assert.deepStrictEqual(bh(ps), [0, 1]);
  assert.strictEqual(ps[bh(ps)[1]], 0.008);
});

test('BH 拒绝的是排序后的前 k 个，不是所有过阈值的', () => {
  const ps = parsePValues(readDoc());
  const kept = bh(ps).map((i) => ps[i]);
  assert.deepStrictEqual(kept, [0.001, 0.008]);
  assert.ok(!kept.includes(0.021));
});

test('族错误率 1−0.95^k 与正文四档对账', () => {
  assert.strictEqual((familyError(3) * 100).toFixed(1), '14.3');
  assert.strictEqual((familyError(10) * 100).toFixed(1), '40.1');
  assert.strictEqual((familyError(20) * 100).toFixed(2), '64.15');
  assert.strictEqual((familyError(50) * 100).toFixed(1), '92.3');
});

test('20 个指标的族错误率为 64.15%', () => {
  const r = compute(readDoc());
  assert.strictEqual(r.indicators, 20);
  assert.ok(Math.abs(r.family20 - 0.6415) < 0.0001);
});

test('脚本可运行，输出含三种校正结果与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /Bonferroni 保留 1 个：0\.001/);
  assert.match(out, /BH 保留 2 个：0\.001、0\.008/);
  assert.match(out, /不构成研究结论/);
});
