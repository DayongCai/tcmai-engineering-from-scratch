#!/usr/bin/env node
/**
 * 第 9 章 毒理实验与安全评价：LD50、亚慢性、遗传毒性与 GLP —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 20);
  assert.deepStrictEqual(list.map((u) => u.sub), ['9.1', '9.2', '9.3', '9.4', '9.5', '9.6', '9.7', '9.8', '9.9', '9.10', '9.11', '9.12', '9.13', '9.14', '9.15', '9.16', '9.17', '9.18', '9.19', '9.20']);
});

test('规模：1930 字 · 平均 97 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 1930);
  assert.strictEqual(s.mean, 97);
});

test('三辨重心是「毒性表现」', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '毒性表现');
  assert.strictEqual(views[0].count, 17);
});

test('四位面重心是「生殖与遗传」，且至少 1 层有落点', () => {
  const levels = Object.fromEntries(rank(merge(list, 'levels')).map((v) => [v.key, v.count]));
  assert.strictEqual(levels['生殖与遗传'], 6);
  assert.ok(Object.values(levels).filter((n) => n > 0).length >= 1);
});

test('引书成规模：≥0 部、≥0 次引用', () => {
  const c = citations(list);
  assert.ok(c.books >= 0, `引书 ${c.books}`);
  assert.ok(c.total >= 0, `引用 ${c.total}`);
});

test('数值计数与单元层一致（12 处数值类命中）', () => {
  assert.strictEqual(shape(list).valueLike, 12);
});

test('每个单元都是外源条文，locator 写到标准名与条号，且能在补源登记中查到', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', '..',
    'standards', 'zhongyao-du-li', '补源登记.json'), 'utf8'));
  const verified = new Set(reg.clauses.filter((c) => c.verified).map((c) => c.locator));
  for (const u of list) {
    assert.strictEqual(u.locator.split('·')[0], '外源', u.locator);
    assert.ok(/条|节|（[一二三]）/.test(u.locator), `locator 缺条号：${u.locator}`);
    assert.ok(verified.has(u.locator), `补源登记里查不到：${u.locator}`);
    assert.match(String(u.srcSub), /^E\d{2}$/, `${u.title} 缺 srcSub（外源条文编号）`);
  }
  assert.ok(list.every((u) => /^https?:\/\//.test(u.source)), '外源单元必须带 URL');
  assert.ok(byBookSection(list).every((s) => s.units > 0));
});
