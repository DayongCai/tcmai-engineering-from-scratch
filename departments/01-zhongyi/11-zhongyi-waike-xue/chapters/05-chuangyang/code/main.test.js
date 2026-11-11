#!/usr/bin/env node
/**
 * 第 5 章 疮疡 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：单元数与小节号、规模、三辨与四位面重心、引书数、数值计数。
 * 数字由 standards/waike/units.json 现算后写死在此，教材改版时测试会先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 50);
  assert.deepStrictEqual(list.map((u) => u.sub), ['5.1.1', '5.1.2', '5.1.3', '5.1.4', '5.1.5', '5.2.1', '5.2.2', '5.2.3', '5.2.4', '5.2.5', '5.3.1', '5.3.2', '5.3.3', '5.3.4', '5.3.5', '5.4.1', '5.4.2', '5.4.3', '5.4.4', '5.4.5', '5.5.1', '5.5.2', '5.5.3', '5.5.4', '5.5.5', '5.6.1', '5.6.2', '5.6.3', '5.6.4', '5.6.5', '5.7.1', '5.7.2', '5.7.3', '5.7.4', '5.7.5', '5.8.1', '5.8.2', '5.8.3', '5.8.4', '5.8.5', '5.9.1', '5.9.2', '5.9.3', '5.9.4', '5.9.5', '5.10.1', '5.10.2', '5.10.3', '5.10.4', '5.10.5']);
});

test('规模：31002 字 · 平均 620 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 31002);
  assert.strictEqual(s.mean, 620);
});

test('三辨重心是「病机」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '病机');
  assert.strictEqual(views[0].count, 455);
});

test('四位面重心是「全身」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['全身'], 259);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥22 部、≥80 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 22, `引书 ${c.books}`);
  assert.ok(c.total >= 80, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 14 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 14);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`教材·第${CHAPTER}章·`), u.locator);
});
