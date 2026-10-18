'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { effect, stdev } = require('./main.js');

test('均值差方向：量表越低越好时，改善为负', () => {
  const r = effect([6, 7, 5], [4, 3, 2], 2);
  assert.strictEqual(r.mean, -3);
});

test('未达 MCID 时 reached=false，即使均值差为负', () => {
  const r = effect([5, 6, 5], [5, 5, 4], 2);
  assert.strictEqual(r.reached, false);
});

test('恰好达到 MCID（闭区间）判 reached=true', () => {
  const r = effect([6, 6, 6], [4, 4, 4], 2);
  assert.strictEqual(r.mean, -2);
  assert.strictEqual(r.reached, true);
});

test('无变异（sd=0）时 dz 为 null，而不是 Infinity', () => {
  const r = effect([5, 5], [4, 4], 1);
  assert.strictEqual(r.dz, null);
});

test('长度不等或空数组必须抛错，不许静默截断', () => {
  assert.throws(() => effect([1, 2], [1], 1), /等长非空/);
  assert.throws(() => effect([], [], 1), /等长非空/);
});

test('stdev 用样本标准差（n-1）', () => {
  assert.strictEqual(+stdev([2, 4, 4, 4, 5, 5, 7, 9]).toFixed(2), 2.14);
});
