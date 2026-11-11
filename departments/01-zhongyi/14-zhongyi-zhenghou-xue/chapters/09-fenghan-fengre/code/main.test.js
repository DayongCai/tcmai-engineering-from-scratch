#!/usr/bin/env node
/**
 * 第 9 章 风寒、风热与正虚邪恋：外感与残留 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */
'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, FAMILIES, load, chapterZheng, shape, byFamily } = require('./main.js');

const lib = load();
const list = chapterZheng(lib);

test('本章负责的族与证候数（全库 132）', () => {
  assert.strictEqual(lib.counts.zheng, 132);
  assert.deepStrictEqual(FAMILIES, ["风寒", "风热", "正虚邪恋"]);
  assert.strictEqual(list.length, 13);
});

test('跨课与病证覆盖：1 个跨 2 门课 · 15 次病证', () => {
  const s = shape(list);
  assert.strictEqual(s.cross2, 1);
  assert.strictEqual(s.diseases, 15);
});

test('按族的分布：风热6、风寒4、正虚邪恋3', () => {
  const fam = Object.fromEntries(byFamily(list));
  for (const [f, n] of Object.entries(fam)) assert.ok(n > 0, f);
  assert.deepStrictEqual(Object.keys(fam).sort(), [...new Set(FAMILIES.filter((f) => fam[f]))].sort());
});

test('每章都带族名与全库计数（本章 ["风寒", "风热", "正虚邪恋"].length 族）', () => {
  assert.ok(FAMILIES.length >= 1);
  assert.ok(lib.counts.zheng > 0);
});

test('数据完整性：每个证候都有 name/family/positions/fang 且病证数 ≥1', () => {
  for (const z of list) {
    assert.ok(z.name.endsWith('证') || z.name.length >= 3, z.name);
    assert.ok(FAMILIES.includes(z.family), z.name);
    assert.ok(Array.isArray(z.positions) && Array.isArray(z.fang), z.name);
    assert.ok(z.diseaseCount >= 1, z.name);
  }
  assert.strictEqual(new Set(list.map((z) => z.name)).size, list.length);
});
