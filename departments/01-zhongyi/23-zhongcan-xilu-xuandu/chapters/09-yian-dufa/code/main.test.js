'use strict';
/**
 * 第 9 章的每个数字都要能从 units.json 现算 —— 断言写死具体值，
 * 数据一改（重新抓取、重新切分）测试必须失败，迫使写的人回头改 docs。
 */
const assert = require('node:assert');
const test = require('node:test');
const { stats, herbTop, segments, xiTop, units, PICKS } = require('./main.js');

test('本章 22 个 unit 全部命中 units.json（无悬空 locator）', () => {
  assert.strictEqual(units.length, 22);
  assert.deepStrictEqual(PICKS.length, units.length);
});

test('规模：22 单元 · 18597 汉字', () => {
  const s = stats();
  assert.strictEqual(s.units, 22);
  assert.strictEqual(s.hanzi, 18597);
});

test('剂量型命中 = 453', () => {
  assert.strictEqual(stats().dose, 453);
});

test('参西命中 = 9（本章口径）', () => {
  assert.strictEqual(stats().xi, 9);
});

test('药物频次首位 = 生怀山药（27 次）', () => {
  const top = herbTop(1)[0];
  if (!top) return;
  assert.deepStrictEqual(top, ['生怀山药', 27]);
});

test('五段式分母 = 21（本章含医案时为案数，否则 0）', () => {
  assert.strictEqual(segments().total, 21);
});

test('参西最密单元 = 1．临症随笔（6）', () => {
  const top = xiTop(1)[0];
  assert.strictEqual(top[0], '1．临症随笔');
  assert.strictEqual(top[1], 6);
});
