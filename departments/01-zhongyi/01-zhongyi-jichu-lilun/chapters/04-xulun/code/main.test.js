'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { bookShape, allParas, mappingShare, mixing, doc } = require('./main.js');

test('教材本体：13 章 / 70 节 / 164 小节 / 327 段 / 45,199 字（全部现算）', () => {
  const s = bookShape();
  assert.strictEqual(s.chapters, 13);
  assert.strictEqual(s.secs, 70);
  assert.strictEqual(s.subs, 164);
  assert.strictEqual(s.paras, 327);
  assert.strictEqual(s.chars, 45199);
});

test('各章段数之和等于总段数（层级不重不漏）', () => {
  const s = bookShape();
  assert.strictEqual(s.perChapter.reduce((n, c) => n + c.paras, 0), s.paras);
  assert.strictEqual(s.perChapter.reduce((n, c) => n + c.chars, 0), s.chars);
});

test('病因章最大（42 段 / 5,761 字），体质章最小（13 段 / 1,443 字）', () => {
  const s = bookShape();
  const max = s.perChapter.slice().sort((a, b) => b.chars - a.chars)[0];
  const min = s.perChapter.slice().sort((a, b) => a.chars - b.chars)[0];
  assert.strictEqual(max.no, '7');
  assert.strictEqual(max.chars, 5761);
  assert.strictEqual(min.no, '12');
  assert.strictEqual(min.chars, 1443);
});

test('映射层：281/327 段带 AI/平台标记（85.9%）', () => {
  const m = mappingShare();
  assert.strictEqual(m.paras, 327);
  assert.strictEqual(m.hit, 281);
  assert.ok(Math.abs(m.share - 0.859) < 0.001);
  assert.strictEqual(m.byChapter.length, 13);
});

test('形体官窍 100% 带映射；体质 38% 最稀', () => {
  const m = mappingShare();
  const by = Object.fromEntries(m.byChapter.map((x) => [x.no, x]));
  assert.strictEqual(by['6'].share, 1);
  assert.strictEqual(by['12'].hit, 5);
  assert.strictEqual(by['12'].paras, 13);
  assert.ok(Math.abs(by['12'].share - 5 / 13) < 1e-9);
});

test('理论句与映射句同段：62/327 = 19.0%（所以不能按段切分原文层）', () => {
  const x = mixing();
  assert.strictEqual(x.mixed, 62);
  assert.strictEqual(x.total, 327);
  assert.ok(Math.abs(x.share - 0.19) < 0.001);
});

test('allParas 拉平后不重复：段数与 bookShape().paras 一致', () => {
  assert.strictEqual(allParas().length, bookShape().paras);
});

test('底本 sha256 与教材母本指纹一致（工作簿一改就红）', () => {
  assert.strictEqual(doc.source.sha256.slice(0, 8), '870b004e');
  assert.strictEqual(doc.chapters.length, 13);
});
