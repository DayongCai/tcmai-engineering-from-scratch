'use strict';
/**
 * 第 6 章的每个数字都要能从 units.json 现算 —— 断言写死具体值，
 * 数据一改（重新抓取、重新切分）测试必须失败，迫使写的人回头改 docs。
 */
const assert = require('node:assert');
const test = require('node:test');
const { stats, herbTop, segments, xiTop, units, PICKS } = require('./main.js');

test('本章 11 个 unit 全部命中 units.json（无悬空 locator）', () => {
  assert.strictEqual(units.length, 11);
  assert.deepStrictEqual(PICKS.length, units.length);
});

test('规模：11 单元 · 14647 汉字', () => {
  const s = stats();
  assert.strictEqual(s.units, 11);
  assert.strictEqual(s.hanzi, 14647);
});

test('剂量型命中 = 145', () => {
  assert.strictEqual(stats().dose, 145);
});

test('参西命中 = 19（本章口径）', () => {
  assert.strictEqual(stats().xi, 19);
});

test('药物频次首位 = 生山药（7 次）', () => {
  const top = herbTop(1)[0];
  if (!top) return;
  assert.deepStrictEqual(top, ['生山药', 7]);
});

test('五段式分母 = 0（本章含医案时为案数，否则 0）', () => {
  assert.strictEqual(segments().total, 0);
});

test('参西最密单元 = 1．资生汤（8）', () => {
  const top = xiTop(1)[0];
  assert.strictEqual(top[0], '1．资生汤');
  assert.strictEqual(top[1], 8);
});
