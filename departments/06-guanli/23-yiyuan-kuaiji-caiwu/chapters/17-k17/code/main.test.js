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
  assert.ok(body.includes('/chapters/17-k17/docs/zh.md'));
});

test('拨款、折旧年限与病区参数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.grant, 800);
  assert.strictEqual(p.life, 10);
  assert.strictEqual(p.cases, 1200);
  assert.strictEqual(p.weight, 1050);
  assert.strictEqual(p.rate, 9800);
  assert.strictEqual(p.feeForService, 1186);
});

test('两套结余与差额', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.dep, 80);
  assert.strictEqual(r.finSurplus, 720);
  assert.strictEqual(r.budgetSurplus, 0);
  assert.strictEqual(r.netAsset, 720);
});

test('DRG 支付与平均每例', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.strictEqual(r.drg, 1029);
  assert.strictEqual(r.perCase, 8575);
  assert.ok(Math.abs(p.weight / p.cases - p.perCase) < 1e-9);
});

test('DRG 与项目收费的差额与降幅', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.diff, -157);
  assert.ok(Math.abs(r.diffRate + 13.237) < 0.01);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 10);
});

test('脚本可运行，输出含两套结余与差额', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /本期盈余 720 万元/);
  assert.match(out, /差额 -157 万元（-13\.2%）/);
  assert.match(out, /不构成会计处理意见/);
});
