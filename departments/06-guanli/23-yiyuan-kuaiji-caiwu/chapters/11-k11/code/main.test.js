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
  assert.ok(body.includes('/chapters/11-k11/docs/zh.md'));
});

test('间接法三项与项目条件从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.surplus, 3600);
  assert.strictEqual(p.depreciation, 4200);
  assert.strictEqual(p.arIncrease, 1800);
  assert.strictEqual(p.project, 20000);
  assert.strictEqual(p.principalY1, 2000);
  assert.strictEqual(p.interestY1, 840);
});

test('经营现金与首年剩余可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.opCash, 6000);
  assert.strictEqual(r.service, 2840);
  assert.strictEqual(r.remaining, 3160);
});

test('月付现成本 6,267 与缺口 3,107', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.monthly - 6266.67) < 0.01);
  assert.ok(Math.abs(r.monthGap - 3106.67) < 0.01);
});

test('医保应收周转与资金成本可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.arDays - 89.846) < 0.01);
  assert.ok(Math.abs(r.capitalCost - 537.6) < 1e-9);
});

test('设备项目：回收期、会计结余、净现值', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.cm, 756);
  assert.strictEqual(r.netCash, 636);
  assert.ok(Math.abs(r.payback - 4.717) < 0.001);
  assert.ok(Math.abs(r.accounting - 279.75) < 0.01);
  assert.ok(Math.abs(r.pvFactor - 6.46321) < 0.001);
  assert.ok(Math.abs(r.npv - 1212) < 1);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 12);
});

test('脚本可运行，输出含缺口与净现值', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /缺口 3,107 万元/);
  assert.match(out, /净现值 \+1,212 万元/);
  assert.match(out, /不构成融资建议/);
});
