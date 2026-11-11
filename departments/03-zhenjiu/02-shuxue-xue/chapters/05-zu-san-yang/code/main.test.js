#!/usr/bin/env node
/**
 * 第 5 章 足三阳经腧穴 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 7);
  assert.deepStrictEqual(list.map((u) => u.sub), ['6.3.1', '6.3.2', '6.3.3', '10.3.1', '10.3.2', '14.3.1', '14.3.2']);
});

test('规模：22331 字 · 平均 3190 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 22331);
  assert.strictEqual(s.mean, 3190);
});

test('三辨重心是「主治」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '主治');
  assert.strictEqual(views[0].count, 835);
});

test('四位面重心是「头面颈项」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['头面颈项'], 664);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥10 部、≥21 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 10, `引书 ${c.books}`);
  assert.ok(c.total >= 21, `引用 ${c.total}`);
});

test('数值计数与单元层一致（1029 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 1029);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
