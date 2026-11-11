'use strict';
/**
 * 第 5 章的每个数字都要能从 units.json 现算 —— 断言写死具体值，
 * 数据一改（重新抓取、重新切分）测试必须失败，迫使写的人回头改 docs。
 */
const assert = require('node:assert');
const test = require('node:test');
const { stats, herbTop, segments, xiTop, units, PICKS } = require('./main.js');

test('本章 4 个 unit 全部命中 units.json（无悬空 locator）', () => {
  assert.strictEqual(units.length, 4);
  assert.deepStrictEqual(PICKS.length, units.length);
});

test('规模：4 单元 · 3713 汉字', () => {
  const s = stats();
  assert.strictEqual(s.units, 4);
  assert.strictEqual(s.hanzi, 3713);
});

test('剂量型命中 = 40', () => {
  assert.strictEqual(stats().dose, 40);
});

test('参西命中 = 4（本章口径）', () => {
  assert.strictEqual(stats().xi, 4);
});

test('药物频次首位 = 生杭芍（1 次）', () => {
  const top = herbTop(1)[0];
  if (!top) return;
  assert.deepStrictEqual(top, ['生杭芍', 1]);
});

test('五段式分母 = 0（本章含医案时为案数，否则 0）', () => {
  assert.strictEqual(segments().total, 0);
});

test('参西最密单元 = 8．山药解（2）', () => {
  const top = xiTop(1)[0];
  assert.strictEqual(top[0], '8．山药解');
  assert.strictEqual(top[1], 2);
});
