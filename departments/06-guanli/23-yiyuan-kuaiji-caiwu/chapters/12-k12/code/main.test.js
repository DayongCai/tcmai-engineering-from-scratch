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
  assert.ok(body.includes('/chapters/12-k12/docs/zh.md'));
});

test('付款差错与三方核对参数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.payments, 32000);
  assert.strictEqual(p.errorRate, 1.8);
  assert.strictEqual(p.errors, 576);
  assert.strictEqual(p.catchRate, 62);
  assert.strictEqual(p.caught, 357);
  assert.strictEqual(p.controlCost, 18);
});

test('两道控制的净额：一赚一亏', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.netControl - 410.4) < 0.6);
  assert.strictEqual(Math.round(r.extraCost), 330);
});

test('五条风险齐备，期望损失合计 2,160 万元', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.risks.length, 5);
  assert.strictEqual(compute(p).riskTotal, 2160);
});

test('最大风险是医保拒付 840 万元', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(r.maxRisk.name.includes('医保'));
  assert.strictEqual(r.maxRisk.loss, 840);
});

test('三项控制的净收益与成本效益比', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.strictEqual(r.netBenefit, 330);
  assert.ok(Math.abs(r.ratio - 2.57) < 0.01);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 10);
});

test('脚本可运行，输出含两道控制的净额', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /净 410 万元/);
  assert.match(out, /多付 330 万元/);
  assert.match(out, /不构成审计结论/);
});
