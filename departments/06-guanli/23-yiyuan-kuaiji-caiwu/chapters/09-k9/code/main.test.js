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
  assert.ok(body.includes('/chapters/09-k9/docs/zh.md'));
});

test('支付标准、变动成本与固定成本从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.pay, 12800);
  assert.strictEqual(p.variable, 8600);
  assert.strictEqual(p.fixedPerCase, 4900);
  assert.strictEqual(p.fixedTotal, 1470);
  assert.strictEqual(p.cases, 3200);
  assert.strictEqual(p.variableLow, 8000);
});

test('边际贡献与保本量可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.cm, 4200);
  assert.strictEqual(r.bep, 3500);
  assert.strictEqual(r.atCases, -126);
});

test('降耗材后保本量进位到 3,063 例，结余 +66 万元', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.cmLow, 4800);
  assert.strictEqual(r.bepCeil, 3063);
  assert.strictEqual(r.atCasesLow, 66);
});

test('杠杆与三个指标与正文一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.leverage - 23.27) < 0.01);
  assert.ok(Math.abs(r.materialRate - 26.506) < 0.01);
  assert.ok(Math.abs(r.costRatio - 0.9566) < 0.001);
  assert.ok(Math.abs(r.cmRate - 32.8125) < 0.01);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 10);
});

test('脚本可运行，输出含两套保本量与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /保本量：1,470 万 ÷ 4,200 = 3,500 例；3,200 例时结余 -126 万元/);
  assert.match(out, /进位 3,063 例/);
  assert.match(out, /不构成价格谈判依据/);
});
