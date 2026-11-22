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
  assert.ok(body.includes('/chapters/03-k3/docs/zh.md'));
});

test('七个金额从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.deepStrictEqual(p, {
    revenue: 7200, cash: 6400, arBegin: 1100, arEnd: 1900,
    depreciation: 520, consumed: 2100, purchased: 2280,
  });
});

test('应收流水式：月初 + 收入 − 收现 = 月末', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(compute(p).arEndFromFlow, p.arEnd);
});

test('收入差等于应收净增（平行记账的恒等式）', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.revenueGap, 800);
  assert.strictEqual(r.arNet, 800);
  assert.ok(r.balanced);
});

test('存货净增与三类差异合计可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.stockNet, 180);
  assert.strictEqual(r.totalGap, 1500);
});

test('正文报告的每个数都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 5);
});

test('脚本可运行，输出含恒等式判定与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /恒等式成立/);
  assert.match(out, /合计差异　　1,500/);
  assert.match(out, /不构成账务处理指令/);
});
