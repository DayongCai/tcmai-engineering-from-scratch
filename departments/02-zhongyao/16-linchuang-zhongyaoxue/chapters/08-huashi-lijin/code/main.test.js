#!/usr/bin/env node
/**
 * 第 8 章 化湿药与利水渗湿药 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 4);
  assert.deepStrictEqual(list.map((u) => u.sub), ['8.1.1', '8.2.1', '8.2.2', '8.2.3']);
});

test('规模：21747 字 · 平均 5437 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 21747);
  assert.strictEqual(s.mean, 5437);
});

test('三辨重心是「临床应用」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '临床应用');
  assert.strictEqual(views[0].count, 566);
});

test('四位面重心是「脾胃」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['脾胃'], 758);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥19 部、≥51 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 19, `引书 ${c.books}`);
  assert.ok(c.total >= 51, `引用 ${c.total}`);
});

test('数值计数与单元层一致（0 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 0);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
