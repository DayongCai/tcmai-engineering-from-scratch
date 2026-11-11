#!/usr/bin/env node
/**
 * 第 1 章 手法的分类与基本要求 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 10);
  assert.deepStrictEqual(list.map((u) => u.sub), ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.2.3', '2.1.1', '2.1.2', '3.1.1', '3.1.2', '3.1.3']);
});

test('规模：37401 字 · 平均 3740 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 37401);
  assert.strictEqual(s.mean, 3740);
});

test('三辨重心是「手法动作」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '手法动作');
  assert.strictEqual(views[0].count, 767);
});

test('四位面重心是「指」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['指'], 142);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥47 部、≥91 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 47, `引书 ${c.books}`);
  assert.ok(c.total >= 91, `引用 ${c.total}`);
});

test('数值计数与单元层一致（10 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 10);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
