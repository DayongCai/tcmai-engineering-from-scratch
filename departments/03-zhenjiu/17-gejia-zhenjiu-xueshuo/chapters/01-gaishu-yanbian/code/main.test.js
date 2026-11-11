#!/usr/bin/env node
/**
 * 第 1 章 各家针灸学说概述 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 4);
  assert.deepStrictEqual(list.map((u) => u.sub), ['1.1.1', '1.1.2', '1.2.1', '1.2.2']);
});

test('规模：7699 字 · 平均 1925 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 7699);
  assert.strictEqual(s.mean, 1925);
});

test('三辨重心是「学说主张」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '学说主张');
  assert.strictEqual(views[0].count, 132);
});

test('四位面（时代）重心是「明清近代」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['明清近代'], 69);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥44 部、≥84 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 44, `引书 ${c.books}`);
  assert.ok(c.total >= 84, `引用 ${c.total}`);
});

test('数值计数与单元层一致（0 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 0);
});

test('每节都有单元，且每单元 locator 指到教材章与小节', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
});
