#!/usr/bin/env node
/**
 * 第 7 章 脾系疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：单元数与小节号、规模、三辨与四位面重心、引书数、数值计数。
 * 数字由 standards/erke/units.json 现算后写死在此，教材改版时测试会先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 45);
  assert.deepStrictEqual(list.map((u) => u.sub), ['7.1.1', '7.1.2', '7.1.3', '7.1.4', '7.1.5', '7.2.1', '7.2.2', '7.2.3', '7.2.4', '7.2.5', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5', '7.4.1', '7.4.2', '7.4.3', '7.4.4', '7.4.5', '7.5.1', '7.5.2', '7.5.3', '7.5.4', '7.5.5', '7.6.1', '7.6.2', '7.6.3', '7.6.4', '7.6.5', '7.7.1', '7.7.2', '7.7.3', '7.7.4', '7.7.5', '7.8.1', '7.8.2', '7.8.3', '7.8.4', '7.8.5', '7.9.1', '7.9.2', '7.9.3', '7.9.4', '7.9.5']);
});

test('规模：33152 字 · 平均 737 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 33152);
  assert.strictEqual(s.mean, 737);
});

test('三辨重心是「证候表现」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '证候表现');
  assert.strictEqual(views[0].count, 381);
});

test('四位面重心是「脾胃系」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['脾胃系'], 1121);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥34 部、≥97 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 34, `引书 ${c.books}`);
  assert.ok(c.total >= 97, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 30 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 30);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`教材·第${CHAPTER}章·`), u.locator);
});
