#!/usr/bin/env node
/**
 * 第 1 章 方剂与治法 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在「可对账的结构」上：合计、分组、边界。
 * 不锁死具体方名排序，以免教材增删附方时测试变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  load,
  bafaTable,
  outsideByChapter,
  groupBySection,
  chapterHanzi,
  faOf,
} = require('./main');

const { formulas: fj, base } = load();

test('八法各栏方数之和等于 52，且每栏 n 与其方名清单长度一致', () => {
  const table = bafaTable(fj);
  assert.strictEqual(table.length, 8, '八法应为八条');
  for (const r of table) {
    assert.strictEqual(r.n, r.names.length, `${r.fa}法：n=${r.n} 与方名数 ${r.names.length} 不符`);
  }
  assert.strictEqual(table.reduce((n, r) => n + r.n, 0), 52);
});

test('52 属八法 + 62 不属八法 = 114，没有第三类', () => {
  const inBafa = fj.formulas.filter((f) => f.fa).length;
  const out = [...outsideByChapter(fj).values()].reduce((n, a) => n + a.length, 0);
  assert.strictEqual(inBafa, 52);
  assert.strictEqual(out, 62);
  assert.strictEqual(inBafa + out, fj.formulas.length);
  assert.strictEqual(fj.formulas.length, 114);
});

test('汗法 8 首即教材第5章全部方剂，不多不少', () => {
  const han = bafaTable(fj).find((r) => r.fa === '汗');
  const ch5 = fj.formulas.filter((f) => f.chapter === '5').map((f) => f.name).sort();
  assert.deepStrictEqual(han.names.slice().sort(), ch5);
  assert.strictEqual(ch5.length, 8);
});

test('本章教材字数 = 第2章 14569 + 第1章 8759 = 23328', () => {
  assert.strictEqual(chapterHanzi(base, ['2']), 14569);
  assert.strictEqual(chapterHanzi(base, ['1']), 8759);
  assert.strictEqual(chapterHanzi(base, ['2', '1']), 23328);
});

test('法外 62 首散在第 9–23 章的 12 个章里，一章两法只出现在第22章', () => {
  const outside = outsideByChapter(fj);
  assert.strictEqual(outside.size, 12);
  // 第22章 22.1 驱虫（法外）与 22.2 涌吐（吐法）同章异法
  assert.strictEqual(outside.get('22').length, 1);
  assert.strictEqual(fj.formulas.filter((f) => f.chapter === '22' && f.fa === '吐').length, 1);
});

test('一法多方：汗法 8 首按节分成 4 / 3 / 1', () => {
  const g = groupBySection(fj, 5);
  assert.deepStrictEqual([...g.keys()], ['5.1 辛温解表剂', '5.2 辛凉解表剂', '5.3 扶正解表剂']);
  assert.deepStrictEqual([...g.values()].map((a) => a.length), [4, 3, 1]);
});

test('法外之方不就近归并：香薷散属于八法之外，而非「清」法', () => {
  assert.strictEqual(faOf(fj, '香薷散'), null);
  assert.strictEqual(faOf(fj, '麻黄汤'), '汗');
  assert.strictEqual(faOf(fj, '六味地黄丸'), '补');
  assert.throws(() => faOf(fj, '不存在的方'), /没有/);
});
