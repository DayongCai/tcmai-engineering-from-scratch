#!/usr/bin/env node
/**
 * 第 13 章 中药商品的品牌与知识产权 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 1);
  assert.deepStrictEqual(list.map((u) => u.sub), ['13.1.2']);
});

test('规模：10906 字 · 平均 10906 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 10906);
  assert.strictEqual(s.mean, 10906);
});

test('三辨重心是「流通与价格」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '流通与价格');
  assert.strictEqual(views[0].count, 150);
});

test('四位面重心是「监管与追溯」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['监管与追溯'], 160);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥9 部、≥15 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 9, `引书 ${c.books}`);
  assert.ok(c.total >= 15, `引用 ${c.total}`);
});

test('数值计数与单元层一致（14 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 14);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
