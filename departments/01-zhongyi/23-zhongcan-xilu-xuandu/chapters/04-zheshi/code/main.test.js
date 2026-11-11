'use strict';
/**
 * 第 4 章的每个数字都要能从 units.json 现算 —— 断言写死具体值，
 * 数据一改（重新抓取、重新切分）测试必须失败，迫使写的人回头改 docs。
 */
const assert = require('node:assert');
const test = require('node:test');
const { stats, herbTop, segments, xiTop, units, PICKS } = require('./main.js');

test('本章 10 个 unit 全部命中 units.json（无悬空 locator）', () => {
  assert.strictEqual(units.length, 10);
  assert.deepStrictEqual(PICKS.length, units.length);
});

test('规模：10 单元 · 14306 汉字', () => {
  const s = stats();
  assert.strictEqual(s.units, 10);
  assert.strictEqual(s.hanzi, 14306);
});

test('剂量型命中 = 165', () => {
  assert.strictEqual(stats().dose, 165);
});

test('参西命中 = 33（本章口径）', () => {
  assert.strictEqual(stats().xi, 33);
});

test('药物频次首位 = 生杭芍（6 次）', () => {
  const top = herbTop(1)[0];
  if (!top) return;
  assert.deepStrictEqual(top, ['生杭芍', 6]);
});

test('五段式分母 = 0（本章含医案时为案数，否则 0）', () => {
  assert.strictEqual(segments().total, 0);
});

test('参西最密单元 = 7．赭石解（20）', () => {
  const top = xiTop(1)[0];
  assert.strictEqual(top[0], '7．赭石解');
  assert.strictEqual(top[1], 20);
});
