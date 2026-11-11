#!/usr/bin/env node
/**
 * 第 3 章 奇经八脉的循行与功能 —— 确定性单元测试
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
  assert.deepStrictEqual(list.map((u) => u.sub), ['16.1.1', '16.1.2', '16.2.1', '16.2.2', '16.3.1', '16.3.2', '16.4.1']);
});

test('规模：13691 字 · 平均 1956 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 13691);
  assert.strictEqual(s.mean, 1956);
});

test('三辨重心是「主治」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '主治');
  assert.strictEqual(views[0].count, 368);
});

test('四位面重心是「足三阳」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['足三阳'], 46);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥6 部、≥43 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 6, `引书 ${c.books}`);
  assert.ok(c.total >= 43, `引用 ${c.total}`);
});

test('数值计数与单元层一致（218 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 218);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
