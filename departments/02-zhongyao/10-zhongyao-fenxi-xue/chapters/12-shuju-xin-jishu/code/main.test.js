#!/usr/bin/env node
/**
 * 第 12 章 数据完整性与分析新技术 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 5);
  assert.deepStrictEqual(list.map((u) => u.sub), ['1.1.1', '1.1.2', '12.1.1', '12.2.1', '12.2.2']);
});

test('规模：11982 字 · 平均 2396 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 11982);
  assert.strictEqual(s.mean, 2396);
});

test('三辨重心是「数据与限度」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '数据与限度');
  assert.strictEqual(views[0].count, 78);
});

test('四位面重心是「检查」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['检查'], 44);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥3 部、≥6 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 3, `引书 ${c.books}`);
  assert.ok(c.total >= 6, `引用 ${c.total}`);
});

test('数值计数与单元层一致（4 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 4);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
