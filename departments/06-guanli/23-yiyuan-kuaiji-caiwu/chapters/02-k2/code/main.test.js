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
  assert.ok(body.includes('/chapters/02-k2/docs/zh.md'));
});

test('二上二下的五个数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.askBillion, 9.6);
  assert.strictEqual(p.controlBillion, 9.2);
  assert.strictEqual(p.cutWan, 4000);
  assert.strictEqual(p.yearStart, 92000);
  assert.strictEqual(p.device, 1200);
});

test('一上与一下的差额等于正文的压缩额', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.strictEqual(r.askWan, 96000);
  assert.strictEqual(r.controlWan, 92000);
  assert.strictEqual(r.askCut, p.cutWan);
});

test('三个比率可复算且与正文印出的百分数一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.adjustRate - 5.0) < 1e-9);
  assert.ok(Math.abs(r.execRate - 97.205) < 0.01, `执行率 ${r.execRate}`);
  assert.ok(Math.abs(r.carryRate - 2.795) < 0.01, `结转率 ${r.carryRate}`);
});

test('设备年折旧 1,200 ÷ 8 = 150', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.depYear, 150);
});

test('正文报告的比率都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 7);
});

test('脚本可运行，输出含三个比率与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /调整率　4,600 ÷ 92,000 = 5\.0%/);
  assert.match(out, /执行率　93,900 ÷ 96,600 = 97\.2%/);
  assert.match(out, /不构成法律意见/);
});
