'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, parseSetup, parsePrune, entropy, gini, infoGain, giniGain, shouldPrune, reconcile } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('纯节点的熵与基尼都是 0', () => {
  assert.strictEqual(entropy([5, 0]), 0);
  assert.strictEqual(gini([5, 0]), 0);
});

test('熵与基尼在均匀二元分布上取已知值', () => {
  assert.strictEqual(entropy([3, 3]), 1);
  assert.ok(Math.abs(gini([3, 3]) - 0.5) < 1e-12);
  assert.ok(Math.abs(entropy([2, 1]) - 0.9183) < 1e-4);
  assert.ok(Math.abs(gini([2, 1]) - 4 / 9) < 1e-12);
});

test('取值多的属性会推高信息增益', () => {
  const parent = [3, 3];
  const twoWay = [[2, 1], [2, 1]];
  const perfect = [[3, 0], [0, 3]];
  assert.ok(infoGain(parent, perfect) > infoGain(parent, twoWay));
  assert.strictEqual(infoGain(parent, perfect), 1);
});

test('基尼增益与熵增益同向', () => {
  const parent = [3, 3];
  const same = [[2, 1], [2, 1]];
  const perfect = [[3, 0], [0, 3]];
  assert.ok(giniGain(parent, perfect) > giniGain(parent, same));
  assert.ok(Math.abs(giniGain(parent, same) - 0.0556) < 1e-3);
});

test('演算设定从正文读出', () => {
  const s = parseSetup(readDoc());
  assert.strictEqual(s.total, 6);
  assert.strictEqual(s.pos, 3);
  assert.strictEqual(s.neg, 3);
  assert.deepStrictEqual(s.colorGroup, [2, 1]);
  assert.strictEqual(s.colorGain, 0.082);
  assert.strictEqual(s.soundGain, 1.0);
  assert.strictEqual(s.cover, 40);
  assert.strictEqual(s.hit, 36);
  assert.strictEqual(s.totalSamples, 1000);
});

test('剪枝按验证误差判断，不按训练误差', () => {
  const p = parsePrune(readDoc());
  assert.strictEqual(p.treeVal, 0.11);
  assert.strictEqual(p.leafVal, 0.08);
  assert.ok(p.leafTrain > p.treeTrain, '剪枝后训练误差应变大');
  assert.strictEqual(shouldPrune(p), true);
  assert.strictEqual(shouldPrune({ ...p, leafVal: 0.2 }), false);
});

test('正文全部数字与现算对账通过', () => {
  const r = reconcile(readDoc());
  assert.ok(r.rows.every((x) => x.ok), r.rows.filter((x) => !x.ok).map((x) => x.label).join(','));
  assert.strictEqual(r.rows.length, 9);
});

test('正文缺失时抛错', () => {
  assert.throws(() => parseSetup('空文档'), /没找到/);
  assert.throws(() => parsePrune('空文档'), /没找到/);
});

test('脚本可运行且声明边界', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /与正文对账 9\/9 项通过/);
  assert.match(out, /应当剪/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码与习题都不含脚手架名目', () => {
  const body = fs.readFileSync(MAIN, 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!body.includes(bad), `残留 ${bad}`);
  assert.ok(body.includes('/chapters/04-juece-shu/docs/zh.md'), '头部注释未指向本章');
});
