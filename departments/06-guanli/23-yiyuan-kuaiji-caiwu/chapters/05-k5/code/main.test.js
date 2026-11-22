'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  readDoc, parseParams, compute, assertDocNumbers, DOC_PATH,
} = require('./main.js');

test('正文可读，且脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/05-k5/docs/zh.md'));
});

test('周转与折旧参数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.daily, 40);
  assert.strictEqual(p.stockA, 1120);
  assert.strictEqual(p.stockB, 1800);
  assert.strictEqual(p.over, 680);
  assert.strictEqual(p.costRate, 4);
  assert.strictEqual(p.device, 600);
  assert.strictEqual(p.lifeShort, 8);
  assert.strictEqual(p.lifeLong, 10);
});

test('两院周转天数可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.daysA - 28) < 1e-9);
  assert.ok(Math.abs(r.daysB - 45) < 1e-9);
  assert.strictEqual(r.overStock, 680);
});

test('库存占用的资金成本差额 27.2 万元', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.costA - 44.8) < 1e-9);
  assert.ok(Math.abs(r.costB - 72) < 1e-9);
  assert.ok(Math.abs(r.costOver - 27.2) < 1e-9);
});

test('折旧 8 年与 10 年的差是 14.25 万元', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.depShort - 71.25) < 1e-9);
  assert.ok(Math.abs(r.depLong - 57) < 1e-9);
  assert.ok(Math.abs(r.depGap - 14.25) < 1e-9);
});

test('安全库存 40 × 7 × 1.3 = 364 万元', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.safety - 364) < 1e-9);
});

test('正文报告的天数与折旧额都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 9);
});

test('脚本可运行，输出含折旧差额与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /差 14\.25 万元\/年/);
  assert.match(out, /安全库存 = 40 × 7 × 1\.3 = 364\.00 万元/);
  assert.match(out, /不构成资产评估意见/);
});
