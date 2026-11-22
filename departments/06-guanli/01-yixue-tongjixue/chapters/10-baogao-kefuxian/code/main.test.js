'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, sampleSizePerGroup, inflateForDropout, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/10-baogao-kefuxian/docs/zh.md'));
});

test('从正文抓出 d=0.6、失访 20%、α=0.05', () => {
  const r = compute(readDoc());
  assert.strictEqual(r.d, 0.6);
  assert.strictEqual(r.dropout, 0.2);
  assert.strictEqual(r.alpha, 0.05);
});

test('每组原始例数 43.6，向上取整 44', () => {
  const raw = sampleSizePerGroup(0.6);
  assert.ok(Math.abs(raw - 43.61) < 0.02, `raw=${raw}`);
  assert.strictEqual(Math.ceil(raw), 44);
});

test('含 20% 失访后为 55 例/组', () => {
  assert.strictEqual(inflateForDropout(44, 0.2), 55);
  assert.ok(Math.abs(inflateForDropout(44, 0.2) - 55) < 1e-9);
});

test('百分比反算 65.0% × 60 = 39 例', () => {
  const r = compute(readDoc());
  assert.strictEqual(r.pctExample.n, 60);
  assert.strictEqual(r.pctExample.rate * 100, 65);
  assert.strictEqual(r.expectedCount, 39);
});

test('摘要与正文的 40/60、25/60 两个率可复算', () => {
  const r = compute(readDoc());
  assert.strictEqual(r.cross[0].a, 40);
  assert.strictEqual(r.cross[1].a, 25);
  assert.strictEqual(((40 / 60) * 100).toFixed(1), '66.7');
  assert.strictEqual(((25 / 60) * 100).toFixed(1), '41.7');
});

test('n=20 时标准误是标准差的 0.22 倍', () => {
  assert.strictEqual((1 / Math.sqrt(20)).toFixed(2), '0.22');
});

test('脚本可运行，输出含样本量算式与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /每组原始例数 43\.6 → 取整 44 → 含失访 55 例\/组/);
  assert.match(out, /65\.0% × n=60 → 39 例/);
  assert.match(out, /不构成研究结论/);
});
