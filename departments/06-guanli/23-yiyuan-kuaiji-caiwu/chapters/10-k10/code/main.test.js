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
  assert.ok(body.includes('/chapters/10-k10/docs/zh.md'));
});

test('上年成本按性态拆开，且合计等于成本总额', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.cost, 79400);
  assert.strictEqual(p.fixed, 54400);
  assert.strictEqual(p.variable, 25000);
  assert.strictEqual(p.fixed + p.variable, p.cost);
});

test('增量法与零基法的六式闭合', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.incTotal, 83370);
  assert.strictEqual(r.zeroVar, 26250);
  assert.strictEqual(r.cutSum, 1700);
  assert.strictEqual(r.zeroFixed, 52700);
  assert.strictEqual(r.zeroTotal, 78950);
  assert.strictEqual(r.diff, 4420);
});

test('差额占比、固定成本高估额与正文一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.diffRate - 5.3019) < 0.001);
  assert.strictEqual(r.fixedOver, 2720);
});

test('两种方法下的结余可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.surplusInc, 630);
  assert.strictEqual(r.surplusZero, 5050);
  assert.ok(Math.abs(r.surplusRateInc - 0.75) < 1e-9);
});

test('执行进度差与调整率可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(Math.round(r.spentAtTime), 62528);
  assert.strictEqual(Math.round(r.progressGap), 5836);
  assert.ok(Math.abs(r.adjustRate - 10.675) < 0.01);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 13);
});

test('脚本可运行，输出含两法差额与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /差额　　83,370 − 78,950 = 4,420（5\.3%）/);
  assert.match(out, /固定成本被多乘 5%：54,400 × 5% = 2,720 万元/);
  assert.match(out, /不构成预算批复意见/);
});
