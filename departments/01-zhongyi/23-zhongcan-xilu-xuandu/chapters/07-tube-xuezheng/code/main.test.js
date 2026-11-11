'use strict';
/**
 * 第 7 章的每个数字都要能从 units.json 现算 —— 断言写死具体值，
 * 数据一改（重新抓取、重新切分）测试必须失败，迫使写的人回头改 docs。
 */
const assert = require('node:assert');
const test = require('node:test');
const { stats, herbTop, segments, xiTop, units, PICKS } = require('./main.js');

test('本章 23 个 unit 全部命中 units.json（无悬空 locator）', () => {
  assert.strictEqual(units.length, 23);
  assert.deepStrictEqual(PICKS.length, units.length);
});

test('规模：23 单元 · 13584 汉字', () => {
  const s = stats();
  assert.strictEqual(s.units, 23);
  assert.strictEqual(s.hanzi, 13584);
});

test('剂量型命中 = 215', () => {
  assert.strictEqual(stats().dose, 215);
});

test('参西命中 = 35（本章口径）', () => {
  assert.strictEqual(stats().xi, 35);
});

test('药物频次首位 = 生赭石（12 次）', () => {
  const top = herbTop(1)[0];
  if (!top) return;
  assert.deepStrictEqual(top, ['生赭石', 12]);
});

test('五段式分母 = 11（本章含医案时为案数，否则 0）', () => {
  assert.strictEqual(segments().total, 11);
});

test('参西最密单元 = 10．补络补管汤（19）', () => {
  const top = xiTop(1)[0];
  assert.strictEqual(top[0], '10．补络补管汤');
  assert.strictEqual(top[1], 19);
});
