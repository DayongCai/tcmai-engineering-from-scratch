#!/usr/bin/env node
/**
 * 第 6 章 清热药 —— 确定性单元测试
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
  assert.deepStrictEqual(list.map((u) => u.sub), ['6.1.1', '6.2.1', '6.3.1', '6.4.1', '6.5.1', '6.6.1']);
});

test('规模：28136 字 · 平均 4689 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 28136);
  assert.strictEqual(s.mean, 4689);
});

test('三辨重心是「临床应用」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '临床应用');
  assert.strictEqual(views[0].count, 641);
});

test('四位面重心是「心肝」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['心肝'], 540);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥6 部、≥19 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 6, `引书 ${c.books}`);
  assert.ok(c.total >= 19, `引用 ${c.total}`);
});

test('数值计数与单元层一致（0 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 0);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
