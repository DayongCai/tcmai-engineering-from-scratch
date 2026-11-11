#!/usr/bin/env node
/**
 * 第 3 章 《内经》针灸学术思想 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 6);
  assert.deepStrictEqual(list.map((u) => u.sub), ['3.1.1', '3.1.2', '3.2.1', '3.2.2', '3.3.1', '3.3.2']);
});

test('规模：11951 字 · 平均 1992 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 11951);
  assert.strictEqual(s.mean, 1992);
});

test('三辨重心是「文献依据」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '文献依据');
  assert.strictEqual(views[0].count, 239);
});

test('四位面（时代）重心是「先秦两汉」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['先秦两汉'], 300);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥105 部、≥356 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 105, `引书 ${c.books}`);
  assert.ok(c.total >= 356, `引用 ${c.total}`);
});

test('数值计数与单元层一致（2 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 2);
});

test('每节都有单元，且每单元 locator 指到教材章与小节', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
});
