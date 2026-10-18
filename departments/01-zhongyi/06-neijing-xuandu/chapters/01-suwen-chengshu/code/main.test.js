'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { stats, find } = require('./main.js');

test('两书各 81 篇，合计 162 篇', () => {
  const s = stats();
  assert.strictEqual(s.books.素问.pian, 81);
  assert.strictEqual(s.books.灵枢.pian, 81);
  assert.strictEqual(s.total.pian, 162);
});

test('字数与原件一致（口径：去空白、含标点）', () => {
  const s = stats();
  assert.strictEqual(s.books.素问.chars, 318616);
  assert.strictEqual(s.books.灵枢.chars, 242495);
  assert.strictEqual(s.total.chars, 561111);
});

test('素问篇均长于灵枢（体裁差异，被写成断言）', () => {
  const s = stats();
  assert.ok(s.books.素问.avgChars > s.books.灵枢.avgChars);
});

test('按篇名检索：命中返回书名与字数', () => {
  const r = find('至真要大论');
  assert.ok(r);
  assert.strictEqual(r.book, '素问');
  assert.ok(r.chars > 20000);
});

test('检索不到时返回 null，不返回最相近的篇', () => {
  assert.strictEqual(find('不存在的篇名'), null);
});

test('条数与字数各自独立统计，不许用条数估字数', () => {
  const s = stats();
  assert.ok(s.total.blocks > 0);
  assert.notStrictEqual(s.total.chars, s.total.blocks);
});
