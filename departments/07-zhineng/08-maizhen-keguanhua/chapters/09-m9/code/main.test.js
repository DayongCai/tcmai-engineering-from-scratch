'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, peakProfile, share } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '09-m9', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 9);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('轮廓系数表五行的数从正文解析：噪声 0.241→0.234，真实簇 0.408→0.351', () => {
  assert.deepStrictEqual(A.rows.map((r) => r.k), [2, 3, 4, 5, 6]);
  assert.deepStrictEqual(A.rows.map((r) => r.noise), [0.241, 0.238, 0.245, 0.245, 0.234]);
  assert.deepStrictEqual(A.rows.map((r) => r.real), [0.408, 0.557, 0.457, 0.38, 0.351]);
});

test('噪声一列：极差 0.011，最高点 k=4，与次高差 0.000', () => {
  assert.strictEqual(A.noise.span.toFixed(3), '0.011');
  assert.strictEqual(A.noise.bestK, 4);
  assert.strictEqual(A.noise.gap.toFixed(3), '0.000');
  assert.match(TEXT, /跨度只有 0\.011/);
});

test('真实簇一列：峰值在 k=3，抬升邻域 1.2 倍以上', () => {
  assert.strictEqual(A.real.bestK, 3);
  assert.strictEqual(A.real.best.toFixed(3), '0.557');
  assert.ok(A.real.lift > 1.2, String(A.real.lift));
  assert.match(TEXT, /1\.2 倍以上/);
});

test('峰值剖面函数对点数不足报错', () => {
  assert.throws(() => peakProfile([{ k: 2, v: 1 }]));
  const p = peakProfile([{ k: 2, v: 0.4 }, { k: 3, v: 0.6 }, { k: 4, v: 0.4 }]);
  assert.strictEqual(p.bestK, 3);
  assert.ok(Math.abs(p.lift - 1.5) < 1e-12);
});

test('未标准化时幅度只占 0.01%，脉率占 99.99%', () => {
  const s = share(0.2, 20);
  assert.ok(Math.abs(s.a - 0.0001) < 1e-6, String(s.a));
  assert.strictEqual((s.a * 100).toFixed(2), '0.01');
  assert.strictEqual((s.b * 100).toFixed(2), '99.99');
  assert.throws(() => share(0, 20));
});

test('正文数出四条预设、三条 k-means 前提', () => {
  assert.strictEqual(A.presets, 4);
  assert.strictEqual(A.preconditions, 3);
  assert.match(TEXT, /无监督的「无」，只表示没有标签/);
});

test('正文标清合成数据，不冒充真实轮廓系数', () => {
  assert.match(TEXT, /不给出任何真实数据的轮廓系数、ARI 或簇数/);
  assert.match(TEXT, /左列由标准正态随机数生成/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不对应任何真实人群/);
  assert.ok(out.includes('与次高之差 0.000'), '输出里的噪声峰值差与正文不一致');
  assert.ok(out.includes('幅度只占 0.01%'), '输出里的距离占比与正文的 99.99% 不一致');
});
