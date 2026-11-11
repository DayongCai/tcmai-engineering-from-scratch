#!/usr/bin/env node
/**
 * 第 6 章 妇科病证推拿治疗 —— 确定性单元测试
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
  assert.deepStrictEqual(list.map((u) => u.sub), ['6.1.1', '6.1.2', '6.2.1', '6.2.2']);
});

test('规模：10947 字 · 平均 2737 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 10947);
  assert.strictEqual(s.mean, 2737);
});

test('三辨重心是「手法方案」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '手法方案');
  assert.strictEqual(views[0].count, 136);
});

test('四位面重心是「妇科儿科五官」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['妇科儿科五官'], 358);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥16 部、≥28 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 16, `引书 ${c.books}`);
  assert.ok(c.total >= 28, `引用 ${c.total}`);
});

test('数值计数与单元层一致（50 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 50);
});

test('每个单元都来自教材，且 locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
