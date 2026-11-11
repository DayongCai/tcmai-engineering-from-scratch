#!/usr/bin/env node
/**
 * 第 7 章 明代针灸医家学术思想 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 28);
  assert.deepStrictEqual(list.map((u) => u.sub), ['7.1.1', '7.1.2', '7.1.3', '7.1.4', '7.2.1', '7.2.2', '7.2.3', '7.2.4', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.4.1', '7.4.2', '7.4.3', '7.4.4', '7.5.1', '7.5.2', '7.5.3', '7.5.4', '7.6.1', '7.6.2', '7.6.3', '7.6.4', '7.7.1', '7.7.2', '7.7.3', '7.7.4']);
});

test('规模：18971 字 · 平均 678 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 18971);
  assert.strictEqual(s.mean, 678);
});

test('三辨重心是「临证应用」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '临证应用');
  assert.strictEqual(views[0].count, 296);
});

test('四位面（时代）重心是「明清近代」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['明清近代'], 305);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥46 部、≥203 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 46, `引书 ${c.books}`);
  assert.ok(c.total >= 203, `引用 ${c.total}`);
});

test('数值计数与单元层一致（0 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 0);
});

test('每节都有单元，且每单元 locator 指到教材章与小节', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
});
