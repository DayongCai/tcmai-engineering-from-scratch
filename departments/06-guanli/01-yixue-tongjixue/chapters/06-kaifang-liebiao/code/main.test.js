'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, twoByTwo, mcnemar, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/06-kaifang-liebiao/docs/zh.md'));
});

test('从正文抓出 40/60 与 25/60', () => {
  const r = compute(readDoc());
  assert.deepStrictEqual([r.a, r.b], [40, 20]);
  assert.deepStrictEqual([r.c, r.d], [25, 35]);
  assert.deepStrictEqual([r.table.n1, r.table.n2], [60, 60]);
});

test('两率、率差、RR、OR 均可复算', () => {
  const t = twoByTwo(40, 20, 25, 35);
  assert.strictEqual((t.p1 * 100).toFixed(1), '66.7');
  assert.strictEqual((t.p2 * 100).toFixed(1), '41.7');
  assert.strictEqual((t.rd * 100).toFixed(1), '25.0');
  assert.ok(Math.abs(t.rr - 1.6) < 1e-12);
  assert.ok(Math.abs(t.or - 2.8) < 1e-12);
});

test('χ² 与 p 与正文 7.55 / 0.006 一致', () => {
  const t = twoByTwo(40, 20, 25, 35);
  assert.ok(Math.abs(t.chi2 - 7.55) < 0.02, `χ²=${t.chi2}`);
  assert.ok(Math.abs(t.p - 0.006) < 0.0006, `p=${t.p}`);
});

test('期望频数均为 32.5 与 27.5，与正文一致', () => {
  const t = twoByTwo(40, 20, 25, 35);
  assert.deepStrictEqual(t.expected.map((x) => x.toFixed(1)), ['32.5', '27.5', '32.5', '27.5']);
});

test('同一 OR 在不同基线上的绝对率差与正文对账', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.base4.diffPp - 6.4) < 0.06, `4% 基线：${r.base4.diffPp}`);
  assert.ok(Math.abs(r.base10.diffPp - 13.7) < 0.06, `10% 基线：${r.base10.diffPp}`);
});

test('McNemar 复算为 4.27 与 p≈0.039', () => {
  const m = mcnemar(12, 3);
  assert.ok(Math.abs(m.chi2 - 4.27) < 0.02);
  assert.ok(Math.abs(m.p - 0.039) < 0.001);
});

test('脚本可运行，输出含 OR、基线换算与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /RR=1\.60，OR=2\.80/);
  assert.match(out, /对照组 4% → 试验组 10\.4%（差 6\.4 个百分点）/);
  assert.match(out, /不构成疗效结论/);
});
