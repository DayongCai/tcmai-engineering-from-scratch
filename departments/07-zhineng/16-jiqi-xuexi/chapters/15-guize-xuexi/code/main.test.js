'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, precisionOf, coverageOf, recallOf, foilGain, ripper, f1, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('甲更精确、乙覆盖与召回更高', () => {
  const a = { n: 120, hit: 108 };
  const b = { n: 300, hit: 240 };
  assert.strictEqual(precisionOf(a.hit, a.n), 0.9);
  assert.strictEqual(precisionOf(b.hit, b.n), 0.8);
  assert.ok(coverageOf(b.n, 1000) > coverageOf(a.n, 1000));
  assert.ok(recallOf(b.hit, 400) > recallOf(a.hit, 400));
});

test('精度与覆盖此消彼长：加合取项覆盖不增', () => {
  assert.ok(coverageOf(80, 1000) < coverageOf(200, 1000));
});

test('FOIL 增益兼顾规模与纯度', () => {
  const gainA = foilGain(80, 60, 100, 200);
  const gainB = foilGain(150, 110, 100, 200);
  assert.ok(Math.abs(gainA - 46.8) < 0.2);
  assert.ok(Math.abs(gainB - 82.8) < 0.2);
  assert.ok(gainB > gainA, '覆盖更宽的那条增益更大');
  assert.ok(gainA / 80 > gainB / 150, '单位覆盖样本上 A 的纯度收益更高，但规模不足');
});

test('覆盖一条样本时增益接近零', () => {
  assert.ok(Math.abs(foilGain(1, 1, 100, 200)) < 1.01);
});

test('RIPPER 指标对称处理正反例', () => {
  assert.strictEqual(ripper(10, 0), 1);
  assert.ok(Math.abs(ripper(10, 5) - 0.3333) < 1e-4);
  assert.strictEqual(ripper(0, 5), -1);
  assert.strictEqual(ripper(5, 5), 0);
});

test('F1 是对称折中，无法区分漏诊与误诊的代价', () => {
  const a = f1(0.9, 0.27);
  const b = f1(0.8, 0.6);
  assert.ok(b > a, '按 F1，乙更好');
  assert.ok(a > 0 && a < 1);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.m, 1000);
  assert.strictEqual(s.pos, 400);
  assert.strictEqual(s.aN, 120);
  assert.strictEqual(s.aHit, 108);
  assert.strictEqual(s.aAcc, 0.9);
  assert.strictEqual(s.aCov, 0.12);
  assert.strictEqual(s.bN, 300);
  assert.strictEqual(s.bHit, 240);
  assert.strictEqual(s.bAcc, 0.8);
  assert.strictEqual(s.bCov, 0.3);
  assert.strictEqual(s.recallA, 0.27);
  assert.strictEqual(s.recallB, 0.6);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 11);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 11\/11 项通过/);
  assert.match(out, /不得直接作为辨证依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/15-guize-xuexi/docs/zh.md'), '头部注释未指向本章');
});
