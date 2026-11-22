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
  assert.ok(body.includes('/chapters/04-k4/docs/zh.md'));
});

test('资产负债净资产三项与四组结构参数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.assets, 120000);
  assert.strictEqual(p.liab, 45600);
  assert.strictEqual(p.netAssets, 74400);
  assert.strictEqual(p.curAssets, 36000);
  assert.strictEqual(p.curLiab, 40000);
  assert.strictEqual(p.stock, 8000);
});

test('四组结构比率与正文一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.debtRatio - 38.0) < 1e-9);
  assert.ok(Math.abs(r.currentRatio - 0.90) < 1e-9);
  assert.ok(Math.abs(r.quickRatio - 0.70) < 1e-9);
  assert.ok(Math.abs(r.fixedShare - 70.0) < 1e-9);
  assert.strictEqual(r.shortGap, 4000);
});

test('结余三层可复算，且第三层等于本期盈余', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.strictEqual(r.gross, 3600);
  assert.strictEqual(r.afterSubsidy, 1900);
  assert.strictEqual(r.final, 1800);
  assert.strictEqual(r.final, p.surplus);
});

test('间接法经营现金 = 盈余 + 折旧 − 应收增加 + 应付增加', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.strictEqual(r.opCash, 4900);
  assert.strictEqual(r.opCash, p.surplus + p.depreciation - p.arIncrease + p.apIncrease);
});

test('正文报告的比率与结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 9);
});

test('脚本可运行，输出含三层结余与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /1,800 \+ 6,100 − 3,200 \+ 200 = 4,900/);
  assert.match(out, /毛利率 4\.3%/);
  assert.match(out, /不构成投资建议/);
});
