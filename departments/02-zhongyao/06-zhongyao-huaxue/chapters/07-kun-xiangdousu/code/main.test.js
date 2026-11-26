#!/usr/bin/env node
/**
 * 第 7 章 醌与香豆素：一个羰基与一个内酯环，把泻下和荧光分成两路 —— 确定性单元测试（断言值由当前底本现算后烘焙）
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const { CHAPTER, KEYS, load, chapterUnits, merge, rank, shape, citations, byBookSection, quizCheck } = require('./main.js');

const data = load();
const list = chapterUnits(data);

test('本章单元数与映射一致', () => {
  assert.strictEqual(list.length, 7);
  assert.deepStrictEqual(list.map((u) => u.sub), ["4.1.1","4.1.2","4.2.1","4.2.2","5.1.1","5.1.2","5.2.1"]);
  assert.deepStrictEqual(KEYS.slice().sort(), list.map((u) => u.sub).sort());
});

test('规模：28046 字 · 平均 4007 字/单元', () => {
  const s = shape(list);
  assert.strictEqual(s.hanzi, 28046);
  assert.strictEqual(s.mean, 4007);
  assert.strictEqual(s.mean, Math.round(s.hanzi / s.units));
});

test('三栏词频：重心是「结构特征」，三栏都在表上', () => {
  const views = rank(merge(list, 'views'));
  assert.strictEqual(views[0].key, '结构特征');
  assert.strictEqual(views[0].count, 710);
  assert.strictEqual(views.length, 3);
});

test('生源途径四路：重心是「乙酸-丙二酸途径」，且至少两路有落点', () => {
  const levels = rank(merge(list, 'levels'));
  assert.strictEqual(levels[0].key, '乙酸-丙二酸途径');
  assert.strictEqual(levels[0].count, 609);
  assert.strictEqual(levels.length, 4);
  assert.ok(levels.filter((v) => v.count > 0).length >= 2);
});

test('引书与引用次数与单元层一致', () => {
  const c = citations(list);
  assert.strictEqual(c.books, 4);
  assert.strictEqual(c.total, 20);
  assert.ok(c.top.length <= 3);
});

test('每个单元都来自教材，locator 指到教材章与小节', () => {
  for (const u of list) assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/);
  assert.ok(byBookSection(list).every((s) => s.units > 0 && s.hanzi > 0));
});

test('习题与正文同源：6 题、pre/check/post = 1/3/2、check 全部接地', () => {
  const r = quizCheck();
  assert.ok(r.ok, r.issues.join('；'));
  assert.strictEqual(r.stats.questions, 6);
  assert.strictEqual(r.stats.grounded, 3);
});

test('正文结构完整：二级小节 ≥ 5，且含「代价与边界」', () => {
  assert.ok(quizCheck().stats.sections >= 5, `二级小节 ${quizCheck().stats.sections}`);
  const doc = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  assert.ok(doc.includes('## 代价与边界'));
  assert.strictEqual(CHAPTER, '7');
});
