'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, cohort, absoluteFromBase, parseKmRow, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/08-logistic-shengcun/docs/zh.md'));
});

test('从正文抓出 16/40 与 12/80', () => {
  const r = compute(readDoc());
  assert.deepStrictEqual([r.cohort.a, r.cohort.n1], [16, 40]);
  assert.deepStrictEqual([r.cohort.c, r.cohort.n2], [12, 80]);
});

test('OR 为 3.78、风险比为 2.67，二者不相等', () => {
  const c = cohort(16, 40, 12, 80);
  assert.ok(Math.abs(c.or - 3.777) < 0.002);
  assert.ok(Math.abs(c.rr - 2.667) < 0.002);
  assert.notStrictEqual(c.or.toFixed(1), c.rr.toFixed(1));
});

test('两组的 odds 与正文 0.667 / 0.176 对账', () => {
  const c = cohort(16, 40, 12, 80);
  assert.ok(Math.abs(c.odds1 - 0.667) < 0.002);
  assert.ok(Math.abs(c.odds2 - 0.176) < 0.002);
});

test('同一 OR 在 10% 与 20% 基线上的绝对风险与正文对账', () => {
  const c = cohort(16, 40, 12, 80);
  const b10 = absoluteFromBase(0.10, c.or);
  const b20 = absoluteFromBase(0.20, c.or);
  assert.ok(Math.abs(b10.p1 * 100 - 29.6) < 0.1);
  assert.ok(Math.abs(b10.diffPp - 19.6) < 0.1);
  assert.ok(Math.abs(b20.p1 * 100 - 48.6) < 0.1);
  assert.ok(Math.abs(b20.diffPp - 28.6) < 0.1);
});

test('KM 表计数自洽：事件数 + 删失数 = n', () => {
  const doc = readDoc();
  const a = parseKmRow(doc, '甲');
  const b = parseKmRow(doc, '乙');
  assert.deepStrictEqual(a, { n: 20, events: 12, censored: 8, km: 0.65 });
  assert.deepStrictEqual(b, { n: 20, events: 16, censored: 4, km: 0.45 });
  assert.strictEqual(a.events + a.censored, a.n);
  assert.strictEqual(b.events + b.censored, b.n);
});

test('EPV≥10 时 20 个事件最多容纳 2 个自变量', () => {
  assert.strictEqual(compute(readDoc()).epvMax, 2);
});

test('脚本可运行，输出含 OR、绝对风险与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /OR=3\.78，风险比=2\.67/);
  assert.match(out, /10% → 29\.6%（差 19\.6 个百分点）/);
  assert.match(out, /不构成预后判断/);
});
