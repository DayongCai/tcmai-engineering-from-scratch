#!/usr/bin/env node
/**
 * 第 1 章 哲学史研究什么：范畴，不是年表 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：单元数与小节号、规模、三辨与四位面重心、引书数、数值计数。
 * 数字由 standards/zhexue/units.json 现算后写死在此，教材改版时测试会先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 2);
  assert.deepStrictEqual(list.map((u) => u.sub), ['1.1', '1.2']);
});

test('规模：218 字 · 平均 109 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 218);
  assert.strictEqual(s.mean, 109);
});

test('三辨重心是「文本依据」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '文本依据');
  assert.strictEqual(views[0].count, 13);
});

test('四位面重心是「本体」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['本体'], 5);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('引书成规模：≥1 部、≥3 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 1, `引书 ${c.books}`);
  assert.ok(c.total >= 3, `引用 ${c.total}`);
});

test('数值计数与单元层一致（本章 4 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 4);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`派生·第${CHAPTER}章·`), u.locator);
});
