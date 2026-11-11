#!/usr/bin/env node
/**
 * 第 10 章 妊娠病 —— 确定性单元测试
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
  assert.deepStrictEqual(list.map((u) => u.sub), ['10.1.1', '10.1.2', '10.1.3', '10.1.4', '10.1.5', '10.2.1', '10.2.2', '10.2.3', '10.2.4', '10.2.5', '10.3.1', '10.3.2', '10.3.3', '10.3.4', '10.3.5', '10.4.1', '10.4.2', '10.4.3', '10.4.4', '10.4.5', '10.5.1', '10.5.2', '10.5.3', '10.5.4', '10.5.5', '10.6.1', '10.6.2', '10.6.3', '10.6.4', '10.6.5', '10.7.1', '10.7.2', '10.7.3', '10.7.4', '10.7.5', '10.8.1', '10.8.2', '10.8.3', '10.8.4', '10.8.5', '10.9.1', '10.9.2', '10.9.3', '10.9.4', '10.9.5', '10.10.1', '10.10.2', '10.10.3', '10.10.4', '10.10.5', '10.11.1', '10.11.2', '10.11.3', '10.11.4', '10.11.5', '10.12.1', '10.12.2', '10.12.3', '10.12.4', '10.12.5', '10.13.1', '10.13.2', '10.13.3', '10.13.4', '10.13.5', '10.14.1', '10.14.2', '10.14.3', '10.14.4', '10.14.5']);
});

test('规模：35943 字 · 平均 513 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 35943);
  assert.strictEqual(s.mean, 513);
});

test('三辨重心是「病机」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '病机');
  assert.strictEqual(views[0].count, 287);
});

test('四位面重心是「肾」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['肾'], 88);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥32 部、≥94 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 32, `引书 ${c.books}`);
  assert.ok(c.total >= 94, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 31 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 31);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`教材·第${CHAPTER}章·`), u.locator);
});
