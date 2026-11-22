'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, binomTail, wilson, normalApprox, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/03-gailv-chouyang/docs/zh.md'));
});

test('14/20 的点估计与正文 70% 一致', () => {
  const r = compute(readDoc());
  assert.strictEqual(r.n, 20);
  assert.strictEqual(r.k, 14);
  assert.strictEqual(Math.round(r.phat * 100), 70);
});

test('Wilson 区间复算落在正文报告的 48.1%～85.5%', () => {
  const [lo, hi] = wilson(14, 20);
  assert.ok(Math.abs(lo * 100 - 48.1) < 0.1, `下限 ${lo}`);
  assert.ok(Math.abs(hi * 100 - 85.5) < 0.1, `上限 ${hi}`);
});

test('正态近似给出 49.9%～90.1%，与正文一致', () => {
  const [lo, hi] = normalApprox(14, 20);
  assert.ok(Math.abs(lo * 100 - 49.9) < 0.1);
  assert.ok(Math.abs(hi * 100 - 90.1) < 0.1);
});

test('二项尾概率与正文四行逐行对账', () => {
  assert.ok(Math.abs(binomTail(20, 14, 0.5) * 100 - 5.8) < 0.06);
  assert.ok(Math.abs(binomTail(20, 14, 0.6) * 100 - 25.0) < 0.06);
  assert.ok(Math.abs(binomTail(20, 14, 0.7) * 100 - 60.8) < 0.06);
  assert.ok(Math.abs(binomTail(20, 14, 0.8) * 100 - 91.3) < 0.06);
  const r = compute(readDoc());
  assert.strictEqual(r.tails.length, 4);
});

test('设计效应与有效样本量与正文一致', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.deff(20, 0.05) - 1.95) < 0.005);
  assert.ok(Math.abs(r.deff(20, 0.15) - 3.85) < 0.005);
  assert.strictEqual(Math.round(600 / r.deff(20, 0.05)), 308);
  assert.strictEqual(Math.round(600 / r.deff(20, 0.15)), 156);
});

test('脚本可运行，输出含区间、尾概率与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /Wilson 95% 区间 48\.1%～85\.5%/);
  assert.match(out, /真实率 50\.0%：现算 5\.8%/);
  assert.match(out, /不构成研究结论/);
});
