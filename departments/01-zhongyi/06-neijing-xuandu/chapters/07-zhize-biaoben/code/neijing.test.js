'use strict';
/**
 * 第 7 章的底本对读：三个数字必须能从两份语料现算，
 * 与 docs 里「底本对读」块写的一致（换底本/改引文都会红）。
 */
const assert = require('node:assert');
const test = require('node:test');
const { CHAPTER } = require('./neijing.js');

test('本章篇目 4 篇，教材本 5346 字 / 全文 10084 字', () => {
  assert.strictEqual(CHAPTER.pians.length, 4);
  assert.strictEqual(CHAPTER.totals.xuanduHanzi, 5346);
  assert.strictEqual(CHAPTER.totals.fullHanzi, 10084);
});

test('节选篇 1 篇（教材本 < 全文 90%）', () => {
  assert.strictEqual(CHAPTER.totals.excerpt, 1);
  for (const p of CHAPTER.pians) {
    if (p.edition === 'excerpt') assert.ok(p.ratio < 0.9, `${p.title} 标了节选但相似度 ${p.ratio}`);
  }
});

test('引文 8 条，全文篇内逐字命中 8 条', () => {
  assert.strictEqual(CHAPTER.quotes.lines, 8);
  assert.strictEqual(CHAPTER.quotes.hitFull, 8);
  assert.strictEqual(CHAPTER.quotes.missing.length, 8 - 8);
});

test('每篇都能回指 locator（教材·书名·篇名（第N篇））', () => {
  for (const p of CHAPTER.pians) {
    assert.ok(/^黄帝内经·(素问|灵枢)·.+（(素问|灵枢)第[0-9]+篇）$/.test(p.locator), p.locator);
  }
});
