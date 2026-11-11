#!/usr/bin/env node
/**
 * 第 10 章 当代针灸学术流派 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 24);
  assert.deepStrictEqual(list.map((u) => u.sub), ['10.1.1', '10.1.2', '10.1.3', '10.1.4', '10.2.1', '10.2.2', '10.2.3', '10.2.4', '10.3.1', '10.3.2', '10.3.3', '10.3.4', '10.4.1', '10.4.2', '10.4.3', '10.4.4', '10.5.1', '10.5.2', '10.5.3', '10.5.4', '10.6.1', '10.6.2', '10.6.3', '10.6.4']);
});

test('规模：13797 字 · 平均 575 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 13797);
  assert.strictEqual(s.mean, 575);
});

test('三辨重心是「临证应用」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '临证应用');
  assert.strictEqual(views[0].count, 360);
});

test('四位面（时代）重心是「明清近代」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['明清近代'], 102);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥27 部、≥59 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 27, `引书 ${c.books}`);
  assert.ok(c.total >= 59, `引用 ${c.total}`);
});

test('数值计数与单元层一致（5 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 5);
});

test('每节都有单元，且每单元 locator 指到教材章与小节', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
});
