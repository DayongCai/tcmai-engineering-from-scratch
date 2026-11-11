#!/usr/bin/env node
/**
 * 第 6 章 宋金元针灸医家学术思想 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 20);
  assert.deepStrictEqual(list.map((u) => u.sub), ['6.1.1', '6.1.2', '6.1.3', '6.1.4', '6.2.1', '6.2.2', '6.2.3', '6.2.4', '6.3.1', '6.3.2', '6.3.3', '6.3.4', '6.4.1', '6.4.2', '6.4.3', '6.4.4', '6.5.1', '6.5.2', '6.5.3', '6.5.4']);
});

test('规模：12960 字 · 平均 648 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 12960);
  assert.strictEqual(s.mean, 648);
});

test('三辨重心是「临证应用」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '临证应用');
  assert.strictEqual(views[0].count, 232);
});

test('四位面（时代）重心是「宋金元」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['宋金元'], 233);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥44 部、≥137 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 44, `引书 ${c.books}`);
  assert.ok(c.total >= 137, `引用 ${c.total}`);
});

test('数值计数与单元层一致（5 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 5);
});

test('每节都有单元，且每单元 locator 指到教材章与小节', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
});
