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
  assert.ok(body.includes('/chapters/16-k16/docs/zh.md'));
});

test('四个床日数与指标口径计数从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.occupied, 210000);
  assert.strictEqual(p.openBeds365, 277400);
  assert.strictEqual(p.authorized365, 292000);
  assert.strictEqual(p.discharged, 198000);
  assert.strictEqual(p.indicators, 320);
  assert.strictEqual(p.variantIndicators, 74);
});

test('床日数等于床位数乘 365', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(r.bedsCheck);
  assert.ok(r.authCheck);
});

test('三个使用率与正文一致，分歧 4.3 个百分点', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.ok(Math.abs(r.open - 75.7) < 0.01);
  assert.ok(Math.abs(r.authorized - 71.92) < 0.01);
  assert.ok(Math.abs(r.discharged - 71.38) < 0.01);
  assert.ok(Math.abs(r.spread - 4.32) < 0.05);
  assert.strictEqual(p.rowOpen.value, 75.7);
  assert.strictEqual(p.rowAuthorized.value, 71.9);
  assert.strictEqual(p.rowDischarged.value, 71.4);
});

test('口径分歧指标占比 23.1%', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.variantRate - 23.125) < 0.001);
});

test('三套科室口径从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.finUnits, 186);
  assert.strictEqual(p.hisUnits, 214);
  assert.strictEqual(p.hrUnits, 92);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 8);
});

test('脚本可运行，输出含三个使用率与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /按实际开放床日　210,000 ÷ 277,400 = 75\.7%/);
  assert.match(out, /口径分歧.*4\.3 个百分点/);
  assert.match(out, /不构成统计口径的官方解释/);
});
