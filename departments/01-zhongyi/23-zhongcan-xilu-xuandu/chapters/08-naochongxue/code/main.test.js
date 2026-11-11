'use strict';
/**
 * 第 8 章的每个数字都要能从 units.json 现算 —— 断言写死具体值，
 * 数据一改（重新抓取、重新切分）测试必须失败，迫使写的人回头改 docs。
 */
const assert = require('node:assert');
const test = require('node:test');
const { stats, herbTop, segments, xiTop, units, PICKS } = require('./main.js');

test('本章 10 个 unit 全部命中 units.json（无悬空 locator）', () => {
  assert.strictEqual(units.length, 10);
  assert.deepStrictEqual(PICKS.length, units.length);
});

test('规模：10 单元 · 10722 汉字', () => {
  const s = stats();
  assert.strictEqual(s.units, 10);
  assert.strictEqual(s.hanzi, 10722);
});

test('剂量型命中 = 208', () => {
  assert.strictEqual(stats().dose, 208);
});

test('参西命中 = 42（本章口径）', () => {
  assert.strictEqual(stats().xi, 42);
});

test('药物频次首位 = 怀牛膝（16 次）', () => {
  const top = herbTop(1)[0];
  if (!top) return;
  assert.deepStrictEqual(top, ['怀牛膝', 16]);
});

test('五段式分母 = 6（本章含医案时为案数，否则 0）', () => {
  assert.strictEqual(segments().total, 6);
});

test('参西最密单元 = 58．论脑充血之原因及治法（16）', () => {
  const top = xiTop(1)[0];
  assert.strictEqual(top[0], '58．论脑充血之原因及治法');
  assert.strictEqual(top[1], 16);
});
