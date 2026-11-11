#!/usr/bin/env node
/**
 * 第 22 章 智能系·案例三：检索指标与失效案例的移交包 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：单元数与小节号、规模、三辨与四位面重心、引书数、数值计数。
 * 数字由 standards/biye/units.json 现算后写死在此，教材改版时测试会先响。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, load, chapterUnits, merge, rank, shape, citations, bySection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与小节号与教材一致', () => {
  assert.strictEqual(list.length, 1);
  assert.deepStrictEqual(list.map((u) => u.sub), ['22.1']);
});

test('规模：144 字 · 平均 144 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 144);
  assert.strictEqual(s.mean, 144);
});

test('三辨重心是「移交层」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '移交层');
  assert.strictEqual(views[0].count, 1);
});

test('四位面重心是「选题」，且四层都有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['选题'], 1);
  const touched = Object.values(levels).filter((n) => n > 0).length;
  assert.ok(touched >= 3, `仅 ${touched} 层有落点`);
});

test('本章教材不引古籍（引书 0 部）：属现代急诊／重症内容', () => {
  const c = citations(list);
  assert.strictEqual(c.books, 0);
  assert.strictEqual(c.total, 0);
});

test('数值计数与单元层一致（本章 0 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 0);
});

test('每节都有单元，且每单元都带 locator', () => {
  for (const s of bySection(list)) assert.ok(s.units > 0, s.sec);
  for (const u of list) assert.ok(u.locator.startsWith(`派生·第${CHAPTER}章·`), u.locator);
});
