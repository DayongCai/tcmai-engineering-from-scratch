#!/usr/bin/env node
/**
 * 第 11 章 产后病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：单元数与小节号、规模、三辨与四位面重心、引书数、数值计数。
 * 数字由 standards/fuke/units.json 现算后写死在此，教材改版时测试会先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 50);
  assert.deepStrictEqual(list.map((u) => u.sub), ['11.1.1', '11.1.2', '11.1.3', '11.1.4', '11.1.5', '11.2.1', '11.2.2', '11.2.3', '11.2.4', '11.2.5', '11.3.1', '11.3.2', '11.3.3', '11.3.4', '11.3.5', '11.4.1', '11.4.2', '11.4.3', '11.4.4', '11.4.5', '11.5.1', '11.5.2', '11.5.3', '11.5.4', '11.5.5', '11.6.1', '11.6.2', '11.6.3', '11.6.4', '11.6.5', '11.7.1', '11.7.2', '11.7.3', '11.7.4', '11.7.5', '11.8.1', '11.8.2', '11.8.3', '11.8.4', '11.8.5', '11.9.1', '11.9.2', '11.9.3', '11.9.4', '11.9.5', '11.10.1', '11.10.2', '11.10.3', '11.10.4', '11.10.5']);
});

test('规模：26983 字 · 平均 540 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 26983);
  assert.strictEqual(s.mean, 540);
});

test('三辨重心是「病机」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '病机');
  assert.strictEqual(views[0].count, 211);
});

test('四位面重心是「肾」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['肾'], 31);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥19 部、≥59 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 19, `引书 ${c.books}`);
  assert.ok(c.total >= 59, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 23 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 23);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`教材·第${CHAPTER}章·`), u.locator);
});
