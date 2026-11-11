'use strict';
/**
 * 第 5 章的底本对读：三个数字必须能从两份语料现算，
 * 与 docs 里「底本对读」块写的一致（换底本/改引文都会红）。
 */
const assert = require('node:assert');
const test = require('node:test');
const { CHAPTER } = require('./neijing.js');

test('本章篇目 3 篇，教材本 5400 字 / 全文 9989 字', () => {
  assert.strictEqual(CHAPTER.pians.length, 3);
  assert.strictEqual(CHAPTER.totals.xuanduHanzi, 5400);
  assert.strictEqual(CHAPTER.totals.fullHanzi, 9989);
});

test('节选篇 1 篇（教材本 < 全文 90%）', () => {
  assert.strictEqual(CHAPTER.totals.excerpt, 1);
  for (const p of CHAPTER.pians) {
    if (p.edition === 'excerpt') assert.ok(p.ratio < 0.9, `${p.title} 标了节选但相似度 ${p.ratio}`);
  }
});

test('引文 1 条，全文篇内逐字命中 1 条', () => {
  assert.strictEqual(CHAPTER.quotes.lines, 1);
  assert.strictEqual(CHAPTER.quotes.hitFull, 1);
  assert.strictEqual(CHAPTER.quotes.missing.length, 1 - 1);
});

test('每篇都能回指 locator（教材·书名·篇名（第N篇））', () => {
  for (const p of CHAPTER.pians) {
    assert.ok(/^黄帝内经·(素问|灵枢)·.+（(素问|灵枢)第[0-9]+篇）$/.test(p.locator), p.locator);
  }
});
