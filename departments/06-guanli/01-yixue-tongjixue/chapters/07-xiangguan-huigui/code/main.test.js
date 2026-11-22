'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, parsePairs, pearson, spearman, fit, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/07-xiangguan-huigui/docs/zh.md'));
});

test('正文原始表解析出 18 对，首对与末对正确', () => {
  const { xs, ys } = parsePairs(readDoc());
  assert.strictEqual(xs.length, 18);
  assert.strictEqual(ys.length, 18);
  assert.deepStrictEqual([xs[0], ys[0]], [1.8, 7.9]);
  assert.deepStrictEqual([xs[17], ys[17]], [7.4, 10.2]);
});

test('Pearson r 与正文 r≈0.90 一致', () => {
  const { xs, ys } = parsePairs(readDoc());
  assert.ok(Math.abs(pearson(xs, ys).r - 0.9005) < 0.001);
});

test('回归截距、斜率、r²、残差标准差均可复算', () => {
  const { xs, ys } = parsePairs(readDoc());
  const f = fit(xs, ys);
  assert.ok(Math.abs(f.intercept - 6.227) < 0.002);
  assert.ok(Math.abs(f.slope - 0.632) < 0.002);
  assert.ok(Math.abs(f.r2 - 0.81) < 0.005);
  assert.ok(Math.abs(f.residSD - 0.552) < 0.002);
  assert.ok(Math.abs(f.sdY - 1.232) < 0.002);
});

test('斜率 95% 区间与正文 0.470～0.793 对账', () => {
  const { xs, ys } = parsePairs(readDoc());
  const f = fit(xs, ys);
  assert.ok(Math.abs(f.ci[0] - 0.470) < 0.003, `下限 ${f.ci[0]}`);
  assert.ok(Math.abs(f.ci[1] - 0.793) < 0.003, `上限 ${f.ci[1]}`);
});

test('Spearman 在原数据上接近 Pearson，且对单个极端错误更稳', () => {
  const { xs, ys } = parsePairs(readDoc());
  const clean = spearman(xs, ys);
  assert.ok(Math.abs(clean - 0.905) < 0.002);
  const err = ys.slice();
  err[0] = 20;
  assert.ok(pearson(xs, err).r < 0.04);
  assert.ok(Math.abs(spearman(xs, err) - 0.608) < 0.003);
});

test('脚本可运行，输出含误录前后对比与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /Pearson r=0\.900，r²=0\.811/);
  assert.match(out, /把一个 y 从 7\.9 误录成 20：Pearson r=0\.032，Spearman ρ=0\.608/);
  assert.match(out, /不构成因果结论/);
});
