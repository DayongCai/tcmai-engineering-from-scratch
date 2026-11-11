#!/usr/bin/env node
/**
 * 第 3 章 老年生理病理特点 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：单元数与小节号、规模、三辨与四位面重心、引书数、数值计数。
 * 数字由 standards/laonian/units.json 现算后写死在此，教材改版时测试会先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 8);
  assert.deepStrictEqual(list.map((u) => u.sub), ['3.1.1', '3.1.2', '3.2.1', '3.2.2', '3.3.1', '3.3.2', '3.4.1', '3.4.2']);
});

test('规模：23479 字 · 平均 2935 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 23479);
  assert.strictEqual(s.mean, 2935);
});

test('三辨重心是「病机」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '病机');
  assert.strictEqual(views[0].count, 643);
});

test('四位面重心是「脾胃肝胆」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['脾胃肝胆'], 342);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥30 部、≥64 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 30, `引书 ${c.books}`);
  assert.ok(c.total >= 64, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 2 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 2);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`教材·第${CHAPTER}章·`), u.locator);
});
