'use strict';
/**
 * 第 6 章的底本对读：三个数字必须能从两份语料现算，
 * 与 docs 里「底本对读」块写的一致（换底本/改引文都会红）。
 */
const assert = require('node:assert');
const test = require('node:test');
const { CHAPTER } = require('./neijing.js');

test('本章篇目 4 篇，教材本 4475 字 / 全文 4806 字', () => {
  assert.strictEqual(CHAPTER.pians.length, 4);
  assert.strictEqual(CHAPTER.totals.xuanduHanzi, 4475);
  assert.strictEqual(CHAPTER.totals.fullHanzi, 4806);
});

test('节选篇 0 篇（教材本 < 全文 90%）', () => {
  assert.strictEqual(CHAPTER.totals.excerpt, 0);
  for (const p of CHAPTER.pians) {
    if (p.edition === 'excerpt') assert.ok(p.ratio < 0.9, `${p.title} 标了节选但相似度 ${p.ratio}`);
  }
});

test('引文 2 条，全文篇内逐字命中 2 条', () => {
  assert.strictEqual(CHAPTER.quotes.lines, 2);
  assert.strictEqual(CHAPTER.quotes.hitFull, 2);
  assert.strictEqual(CHAPTER.quotes.missing.length, 2 - 2);
});

test('每篇都能回指 locator（教材·书名·篇名（第N篇））', () => {
  for (const p of CHAPTER.pians) {
    assert.ok(/^黄帝内经·(素问|灵枢)·.+（(素问|灵枢)第[0-9]+篇）$/.test(p.locator), p.locator);
  }
});

test('章合计 = 各篇之和（防篇目漏算或重复计入）', () => {
  // totals 与 pians 是两份独立来源（一份汇总、一份逐篇），
  // 底本换版或多算/漏算一篇时，两边就对不上。
  const sumX = CHAPTER.pians.reduce((a, p) => a + p.xuanduHanzi, 0);
  const sumF = CHAPTER.pians.reduce((a, p) => a + p.fullHanzi, 0);
  assert.strictEqual(sumX, CHAPTER.totals.xuanduHanzi, '教材本合计算不平');
  assert.strictEqual(sumF, CHAPTER.totals.fullHanzi, '全文合计算不平');
  assert.strictEqual(CHAPTER.quotes.hitFull + CHAPTER.quotes.missing.length, CHAPTER.quotes.lines, '引文命中+未命中 ≠ 总条数');
});
