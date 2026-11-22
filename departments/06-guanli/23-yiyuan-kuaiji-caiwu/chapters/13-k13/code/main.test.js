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
  assert.ok(body.includes('/chapters/13-k13/docs/zh.md'));
});

test('四维得分与两套权重从正文抓取', () => {
  const p = parseParams(readDoc());
  assert.deepStrictEqual(p.a, [90, 70, 75, 60]);
  assert.deepStrictEqual(p.b, [70, 88, 90, 80]);
  assert.deepStrictEqual(p.wA, [30, 25, 30, 15]);
  assert.deepStrictEqual(p.wB, [50, 15, 20, 15]);
});

test('两套权重下的加权总分与正文一致', () => {
  const r = compute(parseParams(readDoc()));
  assert.ok(Math.abs(r.scoreA - 76.0) < 1e-9);
  assert.ok(Math.abs(r.scoreB - 82.0) < 1e-9);
  assert.ok(Math.abs(r.scoreA2 - 79.5) < 1e-9);
  assert.ok(Math.abs(r.scoreB2 - 78.2) < 1e-9);
  assert.ok(r.flip);
});

test('院感方案：避免例数与 CER 可复算', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.ok(Math.abs(r.baseCases - 76.8) < 1e-9);
  assert.ok(Math.abs(r.avoidA - 43.2) < 1e-9);
  assert.ok(Math.abs(r.avoidB - 19.2) < 1e-9);
  assert.ok(Math.abs(r.cerA - 4.1667) < 0.001);
  assert.ok(Math.abs(r.cerB - 3.6458) < 0.001);
  assert.strictEqual(p.planA.net, 100.8);
  assert.strictEqual(p.planB.net, 54.8);
});

test('ICER 4.58 万元/例，低于阈值 6.5', () => {
  const p = parseParams(readDoc());
  const r = compute(p);
  assert.ok(Math.abs(r.icer - 4.5833) < 0.001);
  assert.ok(r.icer < p.threshold);
});

test('正文报告的结果都能在正文里找到', () => {
  const doc = readDoc();
  const p = parseParams(doc);
  assert.ok(assertDocNumbers(doc, p, compute(p)).length >= 9);
});

test('脚本可运行，输出含排名翻转与 ICER', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /→ 排名翻转/);
  assert.match(out, /ICER\(A 相对 B\) = \(180 − 70\) ÷ \(43\.2 − 19\.2\) = 4\.58 万元\/例/);
  assert.match(out, /不构成绩效分配方案/);
});
