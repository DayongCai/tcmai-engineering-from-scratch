'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, read, grab, arcminToMm, visionFromMAR, logMAR, fiveScale,
  cyclesPerDegree, accommodationDemand, nodalGapFraction, compute, verify
} = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-e43', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.ok(TEXT.startsWith('# 第 3 章'));
  assert.ok(fs.existsSync(DOC));
});

test('1 分视角在 5 米处约 1.45 毫米，且随距离线性放大', () => {
  assert.ok(Math.abs(arcminToMm(5, 1) - 1.4544) < 1e-3);
  assert.ok(Math.abs(R.oneLineAt5m - R.lineMmDoc) < 0.01);
  assert.ok(Math.abs(arcminToMm(2.5, 1) * 2 - arcminToMm(5, 1)) < 1e-6);
});

test('视力与 MAR 互为倒数：MAR 10 分给 0.1，0.5 分给 2.0', () => {
  assert.strictEqual(visionFromMAR(1), 1);
  assert.strictEqual(visionFromMAR(10), 0.1);
  assert.strictEqual(visionFromMAR(0.5), 2);
  assert.ok(Math.abs(R.marFor10 - 10) < 1e-9);
});

test('1.0 对应 30 cpd：两点成周期占 2 分', () => {
  assert.strictEqual(cyclesPerDegree(2), 30);
  assert.strictEqual(R.oneLineCpd, R.cpdDoc);
  assert.ok(R.peakLow >= 3 && R.peakHigh <= 6);
  assert.ok(R.cutLow >= 30 && R.cutHigh <= 60);
});

test('四条换算式：logMAR 与五分记录', () => {
  assert.ok(Math.abs(logMAR(0.2) - 0.69897) < 1e-4);
  assert.ok(Math.abs(fiveScale(0.1) - 4.0) < 1e-9);
  assert.ok(Math.abs(fiveScale(1.0) - 5.0) < 1e-9);
  assert.ok(Math.abs(fiveScale(0.05) - 3.699) < 1e-3);
  // 小数的算术平均与 logMAR 的算术平均不是一件事
  assert.ok(Math.abs(R.meanLog - 0.8239) < 1e-3);
  assert.ok(Math.abs((logMAR(0.1) + logMAR(0.2)) / 2 - 0.8495) < 1e-3);
  assert.ok(Math.abs((logMAR(0.1) + logMAR(0.2)) / 2 - R.meanLog) > 0.02);
});

test('5 米调节需求 0.2 D；结点差在近距才成为误差', () => {
  assert.ok(Math.abs(accommodationDemand(5) - 0.2) < 1e-9);
  assert.strictEqual(R.demand5m, R.demandDoc);
  assert.ok(Math.abs(nodalGapFraction(250) - 0.028) < 1e-9);
  assert.ok(nodalGapFraction(5000) < 0.002);
});

test('verify 通过；把峰值与截止写反即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { cutLow: 2 });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含换算表与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /左为现算/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /照度合格≠对比度合格/);
  assert.ok(out.includes('1.454'), '输出里没有 1 分视角线宽');
  assert.ok(out.includes('30.0 cpd'), '输出里没有 1.0 对应的频率');
});
