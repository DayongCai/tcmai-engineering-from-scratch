'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, voteAccuracy, ensembleVar, oobShare, adaAlpha, adaStep, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('独立投票把 0.65 抬到 0.92，完全相关则原地不动', () => {
  const indep = voteAccuracy(21, 0.65);
  assert.ok(Math.abs(indep - 0.923) < 0.001);
  // 完全相关：每个都错在同一批样本上，投票结果等于单模型
  const same = voteAccuracy(21, 1) ;
  assert.strictEqual(same, 1);
  assert.ok(indep > 0.65);
});

test('投票准确率随单模型准确率单调上升', () => {
  assert.ok(voteAccuracy(21, 0.7) > voteAccuracy(21, 0.65));
  assert.ok(voteAccuracy(21, 0.55) < voteAccuracy(21, 0.65));
});

test('集成方差有地板：ρσ² 与模型数量无关', () => {
  const v = ensembleVar(0.04, 0.8, 50);
  assert.ok(Math.abs(v - 0.0322) < 1e-4);
  const floor = 0.8 * 0.04;
  assert.ok(ensembleVar(0.04, 0.8, 5000) > floor);
  assert.ok(ensembleVar(0.04, 0.8, 5000) - floor < 1e-4);
});

test('相关性降一半，方差降四倍', () => {
  const high = ensembleVar(0.04, 0.8, 50);
  const low = ensembleVar(0.04, 0.2, 50);
  assert.ok(high / low > 3.5 && high / low < 4.5);
});

test('袋外比例趋近 1−e⁻¹', () => {
  assert.ok(oobShare(1000) < 1 / Math.E);
  assert.ok(Math.abs((1 - oobShare(1000)) - 0.632) < 0.001);
});

test('AdaBoost 话语权由错误率反解', () => {
  assert.strictEqual(adaAlpha(0.5), 0);
  assert.ok(Math.abs(adaAlpha(1 / 3) - 0.3466) < 1e-3);
  assert.ok(adaAlpha(0.1) > adaAlpha(0.3));
});

test('权重更新把错样本抬到两倍，且仍归一', () => {
  const w = adaStep([1 / 3, 1 / 3, 1 / 3], adaAlpha(1 / 3), 1);
  assert.ok(Math.abs(w[1] - 0.5) < 1e-9);
  assert.ok(Math.abs(w[0] - 0.25) < 1e-9);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-12);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.m, 21);
  assert.strictEqual(s.p, 0.65);
  assert.strictEqual(s.declaredVote, 0.923);
  assert.strictEqual(s.sigma2, 0.04);
  assert.strictEqual(s.rho, 0.8);
  assert.strictEqual(s.varHigh, 0.0322);
  assert.strictEqual(s.varLow, 0.00864);
  assert.strictEqual(s.errTree, 0.28);
  assert.strictEqual(s.aucGbdt, 0.87);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 7);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 7\/7 项通过/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/08-jicheng-xuexi/docs/zh.md'), '头部注释未指向本章');
});
