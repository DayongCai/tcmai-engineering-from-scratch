#!/usr/bin/env node
/**
 * 第 7 章 经络图的空间结构与坐标 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 6);
  assert.deepStrictEqual(list.map((u) => u.sub), ['2.1.1', '2.1.2', '2.3.1', '2.3.2', '2.3.3', '2.3.4']);
});

test('规模：7150 字 · 平均 1192 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 7150);
  assert.strictEqual(s.mean, 1192);
});

test('三辨重心是「定位」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '定位');
  assert.strictEqual(views[0].count, 374);
});

test('本章四位面不适用：教材此部分不按经脉分区写', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.deepStrictEqual(Object.values(levels), [0, 0, 0, 0]);
});

test('引书成规模：≥17 部、≥37 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 17, `引书 ${c.books}`);
  assert.ok(c.total >= 37, `引用 ${c.total}`);
});

test('数值计数与单元层一致（180 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 180);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
