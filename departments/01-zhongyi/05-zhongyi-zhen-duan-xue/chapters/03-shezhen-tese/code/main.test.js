'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { shape, features, FEATURES, parasOf } = require('./main.js');

test('舌诊四小节合计 1,249 字 = 望诊 44.4%', () => {
  const s = shape();
  assert.strictEqual(s.chars, 1249);
  assert.ok(Math.abs(s.share - 1249 / 2812) < 1e-9);
  assert.deepStrictEqual(s.rows.map((r) => r.no), ['2.3.1', '2.3.2', '2.3.3', '2.3.4']);
});

test('各小节字数：237 / 467 / 365 / 180', () => {
  const s = shape();
  assert.deepStrictEqual(s.rows.map((r) => r.chars), [237, 467, 365, 180]);
  assert.strictEqual(s.rows.reduce((n, r) => n + r.chars, 0), 1249);
});

test('特征词 27 个：5 舌色 + 6 舌形 + 5 舌态 + 7 苔质 + 4 苔色', () => {
  const s = shape();
  assert.strictEqual(s.terms, 27);
  const by = Object.fromEntries(features().map((f) => [f.name, f.items.length]));
  assert.deepStrictEqual(by, { 舌色: 5, 舌形: 6, 舌态: 5, 苔质: 7, 苔色: 4 });
});

test('27 个特征词全部在教材原文出现（不凭记忆补）', () => {
  const miss = features().flatMap((f) => f.items.filter((x) => !x.inText).map((x) => `${f.name}:${x.w}`));
  assert.deepStrictEqual(miss, []);
});

test('苔质是 7 个而不是 6 个（剥落单列）', () => {
  const tz = features().find((f) => f.name === '苔质');
  assert.strictEqual(tz.items.length, 7);
  assert.ok(tz.items.some((x) => x.w === '剥落'));
});

test('字数口径：只算正文段（与第 2 章 1,249 一致，不把段标题算进去）', () => {
  const withTitles = ['2.3.1', '2.3.2', '2.3.3', '2.3.4'].map((n) => parasOf(n).length);
  assert.strictEqual(withTitles.reduce((a, b) => a + b, 0), 1249);
});

test('五组特征词与教材小节对应：舌色/舌形/舌态 → 2.3.2，苔质/苔色 → 2.3.3', () => {
  const by = Object.fromEntries(features().map((f) => [f.name, f.from]));
  assert.deepStrictEqual(by, { 舌色: '2.3.2', 舌形: '2.3.2', 舌态: '2.3.2', 苔质: '2.3.3', 苔色: '2.3.3' });
});
