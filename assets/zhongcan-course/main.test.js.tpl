'use strict';
/**
 * 第 __N__ 章的每个数字都要能从 units.json 现算 —— 断言写死具体值，
 * 数据一改（重新抓取、重新切分）测试必须失败，迫使写的人回头改 docs。
 */
const assert = require('node:assert');
const test = require('node:test');
const { stats, herbTop, segments, xiTop, units, PICKS } = require('./main.js');

test('本章 __PICKS_LEN__ 个 unit 全部命中 units.json（无悬空 locator）', () => {
  assert.strictEqual(units.length, __PICKS_LEN__);
  assert.deepStrictEqual(PICKS.length, units.length);
});

test('规模：__N_UNITS__ 单元 · __N_HANZI__ 汉字', () => {
  const s = stats();
  assert.strictEqual(s.units, __N_UNITS__);
  assert.strictEqual(s.hanzi, __N_HANZI__);
});

test('剂量型命中 = __N_DOSE__', () => {
  assert.strictEqual(stats().dose, __N_DOSE__);
});

test('参西命中 = __N_XI__（本章口径）', () => {
  assert.strictEqual(stats().xi, __N_XI__);
});

test('药物频次首位 = __TOP_HERB__（__TOP_COUNT__ 次）', () => {
  const top = herbTop(1)[0];
  if (!top) return;
  assert.deepStrictEqual(top, ['__TOP_HERB__', __TOP_COUNT__]);
});

test('五段式分母 = __AN_TOTAL__（本章含医案时为案数，否则 0）', () => {
  assert.strictEqual(segments().total, __AN_TOTAL__);
});

test('参西最密单元 = __XT_TITLE__（__XT_N__）', () => {
  const top = xiTop(1)[0];
  assert.strictEqual(top[0], '__XT_TITLE__');
  assert.strictEqual(top[1], __XT_N__);
});
