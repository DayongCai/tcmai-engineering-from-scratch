#!/usr/bin/env node
/**
 * 第 4 章 手三阳经腧穴 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 3);
  assert.deepStrictEqual(list.map((u) => u.sub), ['5.3.1', '9.3.1', '13.3.1']);
});

test('规模：12217 字 · 平均 4072 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 12217);
  assert.strictEqual(s.mean, 4072);
});

test('三辨重心是「主治」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '主治');
  assert.strictEqual(views[0].count, 481);
});

test('四位面重心是「四肢」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['四肢'], 526);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥1 部、≥9 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 1, `引书 ${c.books}`);
  assert.ok(c.total >= 9, `引用 ${c.total}`);
});

test('数值计数与单元层一致（451 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 451);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
