#!/usr/bin/env node
/**
 * 第 4 章 小儿推拿常用手法 —— 确定性单元测试
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
  assert.deepStrictEqual(list.map((u) => u.sub), ['4.1.1', '4.1.2', '4.1.3', '4.1.4', '4.1.5', '4.2.1', '4.2.2']);
});

test('规模：18716 字 · 平均 2674 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 18716);
  assert.strictEqual(s.mean, 2674);
});

test('三辨重心是「手法操作」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '手法操作');
  assert.strictEqual(views[0].count, 800);
});

test('四位面重心是「脾系」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['脾系'], 169);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥12 部、≥29 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 12, `引书 ${c.books}`);
  assert.ok(c.total >= 29, `引用 ${c.total}`);
});

test('数值计数与单元层一致（88 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 88);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
