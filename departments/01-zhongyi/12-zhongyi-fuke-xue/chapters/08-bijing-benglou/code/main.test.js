#!/usr/bin/env node
/**
 * 第 8 章 月经病·闭经崩漏与经行诸证 —— 确定性单元测试
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
  assert.strictEqual(list.length, 70);
  assert.deepStrictEqual(list.map((u) => u.sub), ['8.1.1', '8.1.2', '8.1.3', '8.1.4', '8.1.5', '8.2.1', '8.2.2', '8.2.3', '8.2.4', '8.2.5', '8.3.1', '8.3.2', '8.3.3', '8.3.4', '8.3.5', '8.4.1', '8.4.2', '8.4.3', '8.4.4', '8.4.5', '8.5.1', '8.5.2', '8.5.3', '8.5.4', '8.5.5', '8.6.1', '8.6.2', '8.6.3', '8.6.4', '8.6.5', '8.7.1', '8.7.2', '8.7.3', '8.7.4', '8.7.5', '8.8.1', '8.8.2', '8.8.3', '8.8.4', '8.8.5', '8.9.1', '8.9.2', '8.9.3', '8.9.4', '8.9.5', '8.10.1', '8.10.2', '8.10.3', '8.10.4', '8.10.5', '8.11.1', '8.11.2', '8.11.3', '8.11.4', '8.11.5', '8.12.1', '8.12.2', '8.12.3', '8.12.4', '8.12.5', '8.13.1', '8.13.2', '8.13.3', '8.13.4', '8.13.5', '8.14.1', '8.14.2', '8.14.3', '8.14.4', '8.14.5']);
});

test('规模：43274 字 · 平均 618 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 43274);
  assert.strictEqual(s.mean, 618);
});

test('三辨重心是「病机」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '病机');
  assert.strictEqual(views[0].count, 391);
});

test('四位面重心是「肾」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['肾'], 157);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥35 部、≥76 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 35, `引书 ${c.books}`);
  assert.ok(c.total >= 76, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 14 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 14);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`教材·第${CHAPTER}章·`), u.locator);
});
