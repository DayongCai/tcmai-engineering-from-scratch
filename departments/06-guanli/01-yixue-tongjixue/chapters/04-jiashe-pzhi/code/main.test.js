'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, twoGroup, mdd, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/04-jiashe-pzhi/docs/zh.md'));
});

test('从正文抓出 8.2/7.4、标准差 1.5 与两个样本量', () => {
  const r = compute(readDoc());
  assert.strictEqual(r.meanA, 8.2);
  assert.strictEqual(r.meanB, 7.4);
  assert.strictEqual(r.sd, 1.5);
  assert.strictEqual(r.small.n, 20);
  assert.strictEqual(r.large.n, 60);
});

test('n=20 时 t≈1.69、双侧 p≈0.100', () => {
  const r = twoGroup(0.8, 1.5, 20);
  assert.ok(Math.abs(r.t - 1.69) < 0.01, `t=${r.t}`);
  assert.ok(Math.abs(r.p - 0.100) < 0.002, `p=${r.p}`);
  assert.deepStrictEqual([r.df, r.n], [38, 20]);
});

test('n=60 时 t≈2.92、双侧 p≈0.004', () => {
  const r = twoGroup(0.8, 1.5, 60);
  assert.ok(Math.abs(r.t - 2.92) < 0.01);
  assert.ok(Math.abs(r.p - 0.0042) < 0.0005);
});

test('两个样本量的置信区间与正文对账', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.small.ci[0] + 0.16) < 0.01);
  assert.ok(Math.abs(r.small.ci[1] - 1.76) < 0.01);
  assert.ok(r.large.ci[0] > 0, 'n=60 的区间不跨 0');
  assert.ok(Math.abs(r.large.ci[0] - 0.26) < 0.01);
  assert.ok(Math.abs(r.large.ci[1] - 1.34) < 0.01);
});

test('最小可检出差异为 1.33 与 0.77 分', () => {
  assert.ok(Math.abs(mdd(1.5, 20) - 1.33) < 0.01);
  assert.ok(Math.abs(mdd(1.5, 60) - 0.77) < 0.01);
});

test('标准化差值 d≈0.53，不随样本量改变', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.d - 0.5333) < 0.001);
  assert.ok(Math.abs(r.small.t * r.small.se - r.diff) < 1e-12);
  assert.ok(Math.abs(r.large.t * r.large.se - r.diff) < 1e-12);
});

test('脚本可运行，输出含两组结果与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /每组 20 例：SE=0\.474，t=1\.69，df=38，p=0\.100/);
  assert.match(out, /每组 60 例：SE=0\.274，t=2\.92/);
  assert.match(out, /不构成研究结论/);
});
