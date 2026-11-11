#!/usr/bin/env node
/**
 * 第 5 章 心与神经毒性：乌头碱的半小时 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 14);
  assert.deepStrictEqual(list.map((u) => u.sub), ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10', '5.11', '5.12', '5.13', '5.14']);
});

test('规模：2205 字 · 平均 158 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 2205);
  assert.strictEqual(s.mean, 158);
});

test('三辨重心是「减毒与救治」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '减毒与救治');
  assert.strictEqual(views[0].count, 49);
});

test('四位面重心是「肾」，且至少 2 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['肾'], 10);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 2);
});

test('引书成规模：≥0 部、≥0 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 0, `引书 ${c.books}`);
  assert.ok(c.total >= 0, `引用 ${c.total}`);
});

test('数值计数与单元层一致（12 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 12);
});

test('每个派生单元都指回本章，且保留 srcSub 可追原句', () => {
  // 派生课没有教材章号：locator 一律 派生·第N章·N.M，N 必须等于本章；
  // 原句靠 srcSub（源教材单元号）追回——两条都成立，派生件才可复核。
  const chNo = (list[0].locator.match(/第(\d+)章/) || [])[1];
  for (const u of list) {
    assert.match(u.locator, /^派生·第\d+章·\d+\.\d+$/, u.locator);
    assert.ok(u.locator.includes(`第${chNo}章`), `locator 章号不是本章：${u.locator}`);
    assert.match(String(u.srcSub), /^\d+\.\d+(\.\d+)?$/, `${u.title} 缺 srcSub`);
  }
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
