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
  assert.ok(body.includes('/chapters/15-k15/docs/zh.md'));
});

test('规则、命中与真问题从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.strictEqual(p.rules, 320);
  assert.strictEqual(p.trades, 360000);
  assert.strictEqual(p.hits, 3720);
  assert.strictEqual(p.real, 620);
});

test('命中率与精确率可复算，误报 3,100 笔', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.hitRate - 1.0333) < 0.001);
  assert.ok(Math.abs(r.precision - 16.6667) < 0.001);
  assert.strictEqual(r.falsePositives, 3100);
});

test('确认工时与年工时', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.hoursMonth - 93) < 1e-9);
  assert.ok(Math.abs(r.hoursYear - 1116) < 1e-9);
  assert.ok(Math.abs(r.personYears - 0.62) < 0.01);
});

test('映射比例与自动化人时可复算', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.ok(Math.abs(r.perAccount - 22.581) < 0.01);
  assert.strictEqual(r.manual, 2000);
  assert.strictEqual(r.auto, 125);
  assert.strictEqual(r.saved, 1875);
  assert.ok(Math.abs(r.personYearsSaved - 1.0417) < 0.01);
});

test('例外笔数与优化后的工时', () => {
  const r = compute(parseParams(readDoc()));
  assert.strictEqual(r.exceptions, 96);
  assert.strictEqual(Math.round(r.betterHits), 1240);
  assert.strictEqual(Math.round(r.betterHoursMonth), 31);
  assert.strictEqual(Math.round(r.betterSaved), 744);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 15);
});

test('脚本可运行，输出含精确率与人时', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /精确率 16\.7%/);
  assert.match(out, /净省 1,875 人时/);
  assert.match(out, /不构成系统选型建议/);
});
