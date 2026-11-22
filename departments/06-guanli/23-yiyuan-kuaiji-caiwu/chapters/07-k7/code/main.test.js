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
  assert.ok(body.includes('/chapters/07-k7/docs/zh.md'));
});

test('收入、医保结算与核减从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.revenue, 83000);
  assert.strictEqual(p.insurance, 54000);
  assert.strictEqual(p.cut, 1860);
  assert.strictEqual(p.surplus, 1800);
});

test('门诊加住院等于全年医疗收入', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.strictEqual(p.outpatient, 31000);
  assert.strictEqual(p.inpatient, 52000);
  assert.ok(r.splitMatches);
});

test('占比与核减率可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.outShare - 37.349) < 0.01);
  assert.ok(Math.abs(r.inShare - 62.651) < 0.01);
  assert.ok(Math.abs(r.cutRate - 3.4444) < 0.001);
});

test('核减后结余为 −60 万元', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.afterCut, -60);
});

test('正文报告的占比与结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 6);
});

test('脚本可运行，输出含核减率与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /核减率：1,860 ÷ 54,000 = 3\.44%/);
  assert.match(out, /核减后结余：1,800 − 1,860 = -60/);
  assert.match(out, /不构成医保结算意见/);
});
