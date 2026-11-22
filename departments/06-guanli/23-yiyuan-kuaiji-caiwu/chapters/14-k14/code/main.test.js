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
  assert.ok(body.includes('/chapters/14-k14/docs/zh.md'));
});

test('问题数与整改数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.issues, 86);
  assert.strictEqual(p.fixed, 53);
  assert.strictEqual(p.issueAmount, 1240);
  assert.strictEqual(p.fixedAmount, 780);
  assert.strictEqual(p.repeatCount, 35);
});

test('改造率与重复率可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.fixedRate - 61.627) < 0.01);
  assert.ok(Math.abs(r.fixedAmountRate - 62.903) < 0.01);
  assert.ok(Math.abs(r.repeatRate - 40.697) < 0.01);
});

test('抽样差错率、标准误与区间与正文一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.rate - 7.5) < 1e-9);
  assert.ok(Math.abs(r.se - 0.02404) < 1e-5);
  assert.ok(Math.abs(r.half - 4.713) < 0.01);
  assert.strictEqual(r.lowPct, 2.8);
  assert.strictEqual(r.highPct, 12.2);
});

test('点估计与金额区间可复算', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.point, 1395);
  assert.ok(Math.abs(r.lowAmount - 520.8) < 0.01);
  assert.ok(Math.abs(r.highAmount - 2269.2) < 0.01);
  assert.ok(Math.abs(r.widthRatio - 1.253) < 0.01);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 10);
});

test('脚本可运行，输出含点估计与区间', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /点估计 18,600 × 7\.5% = 1,395 万元/);
  assert.match(out, /区间宽度是点估计的 1\.25 倍/);
  assert.match(out, /不构成审计结论/);
});
