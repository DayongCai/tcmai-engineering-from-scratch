'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, meanVariance, pNeverDrawn, adaWeight } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-m8', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('方差表的四档 M 从表头读出：1 / 5 / 20 / 100', () => {
  assert.deepStrictEqual(A.Ms, [1, 5, 20, 100]);
  assert.deepStrictEqual(A.rows.map((r) => r.rho), [0, 0.5, 0.9, 0.99]);
});

test('ρσ² + (1−ρ)σ²/M 重算与表内十六格逐格一致', () => {
  for (const row of A.rows) {
    const calc = A.Ms.map((M) => meanVariance(M, row.rho));
    calc.forEach((v, i) => assert.ok(Math.abs(v - row.stated[i]) < 0.011, `ρ=${row.rho} M=${A.Ms[i]}: ${v} vs ${row.stated[i]}`));
  }
  assert.strictEqual(meanVariance(1, 0.9), 1);
  assert.strictEqual(meanVariance(100, 0.9).toFixed(2), '0.90');
  assert.strictEqual(meanVariance(100, 0).toFixed(3), '0.010');
  assert.throws(() => meanVariance(0, 0.5));
});

test('自助采样：(1−1/n)ⁿ 趋 1/e，60 人里约剩 38 个不同个体', () => {
  assert.ok(Math.abs(pNeverDrawn(60) - 0.3648) < 0.002, String(pNeverDrawn(60)));
  assert.ok(Math.abs(pNeverDrawn(100000) - 1 / Math.E) < 1e-4);
  assert.strictEqual((60 * (1 - pNeverDrawn(60))).toFixed(0), '38');
  assert.ok(Math.abs(1 - pNeverDrawn(60) - 0.632) < 0.005, '抽样覆盖率应接近 63.2%');
  assert.strictEqual(A.n, 60);
});

test('AdaBoost 的指数权重：第 10 轮两万多倍', () => {
  assert.strictEqual(adaWeight(1, 0.5).toFixed(1), '2.7');
  assert.strictEqual(adaWeight(3, 0.5).toFixed(1), '20.1');
  assert.strictEqual(adaWeight(5, 0.5).toFixed(1), '148.4');
  assert.strictEqual(Math.round(adaWeight(10, 0.5)), 22026);
  assert.deepStrictEqual(A.boost.map((b) => b.round), [1, 3, 5, 10]);
});

test('OOB 按段时的泄漏与第 6 章同一个算术：0.832', () => {
  assert.strictEqual(A.oobLeak.toFixed(3), '0.832');
  assert.match(TEXT, /1 − 0\.8⁸ = 0\.83/);
});

test('正文不给实测 AUC 与集成规模，只给演算设定', () => {
  assert.match(TEXT, /演算设定/);
  assert.match(TEXT, /不给出任何实测 AUC、样本量与集成规模/);
  assert.match(TEXT, /0\.82 ± 0\.03 与 0\.76 ~ 0\.87 的极差/);
  assert.match(TEXT, /不对应任何真实研究/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /演算设定/);
  assert.ok(out.includes('也只把方差降到 0.90'), '输出里的 ρ=0.9 那一档与正文不一致');
  assert.ok(out.includes('22026'), '输出里的第 10 轮权重与正文的两万多倍不一致');
  assert.match(out, /约 38 个人/);
});
