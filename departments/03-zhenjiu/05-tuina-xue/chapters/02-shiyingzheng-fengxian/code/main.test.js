#!/usr/bin/env node
/**
 * 第 2 章 推拿的适应证、禁忌与风险 —— 确定性单元测试
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
  assert.deepStrictEqual(list.map((u) => u.sub), ['4.3.1', '4.3.2', '10.1.1', '10.1.2', '10.2.1', '10.2.2']);
});

test('规模：18889 字 · 平均 3148 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 18889);
  assert.strictEqual(s.mean, 3148);
});

test('三辨重心是「手法操作」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '手法操作');
  assert.strictEqual(views[0].count, 836);
});

test('四位面重心是「滑利关节」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['滑利关节'], 59);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥1 部、≥4 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 1, `引书 ${c.books}`);
  assert.ok(c.total >= 4, `引用 ${c.total}`);
});

test('数值计数与单元层一致（6 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 6);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
