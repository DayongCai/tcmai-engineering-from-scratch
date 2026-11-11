'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { bookShape, fourDiagnosis, bianzheng, threeStages, principles, chapter } = require('./main.js');

test('教材本体：14 章 / 46 节 / 105 小节 / 196 段 / 22,215 字', () => {
  const s = bookShape();
  assert.strictEqual(s.chapters, 14);
  assert.strictEqual(s.secs, 46);
  assert.strictEqual(s.subs, 105);
  assert.strictEqual(s.paras, 196);
  assert.strictEqual(s.chars, 22215);
  assert.strictEqual(s.perChapter.length, 14);
});

test('各章字数之和等于全书（不重不漏）', () => {
  const s = bookShape();
  assert.strictEqual(s.perChapter.reduce((n, c) => n + c.chars, 0), 22215);
});

test('四诊：望 2,812 / 问 2,281 / 切 2,030 / 闻 855，合计 7,978（35.9%）', () => {
  const f = fourDiagnosis();
  const by = Object.fromEntries(f.rows.map((r) => [r.name, r.chars]));
  assert.deepStrictEqual(by, { 望诊: 2812, 闻诊: 855, 问诊: 2281, 切诊: 2030 });
  assert.strictEqual(f.total, 7978);
  assert.ok(Math.abs(f.share - 7978 / 22215) < 1e-9);
});

test('望/闻 = 3.29 倍：四诊在教材里是倾斜分配', () => {
  const f = fourDiagnosis();
  assert.strictEqual(f.max.name, '望诊');
  assert.strictEqual(f.min.name, '闻诊');
  assert.strictEqual(f.ratio, 3.29);
});

test('辨证七章：8,869 字 = 39.9%，其中三焦最薄（356 字 / 1.6%）', () => {
  const b = bianzheng();
  assert.strictEqual(b.total, 8869);
  assert.ok(Math.abs(b.share - 8869 / 22215) < 1e-9);
  const min = b.rows.slice().sort((x, y) => x.chars - y.chars)[0];
  assert.strictEqual(min.no, '12');
  assert.strictEqual(min.chars, 356);
});

test('三段：采集 7,978 · 判断 8,869 · 输出 1,307（5.9% 最薄）', () => {
  const s = threeStages();
  const by = Object.fromEntries(s.rows.map((r) => [r.name, r.chars]));
  assert.strictEqual(by['采集（四诊）'], 7978);
  assert.strictEqual(by['判断（辨证）'], 8869);
  assert.strictEqual(by['输出（病案）'], 1307);
  assert.ok(Math.abs(by['输出（病案）'] / 22215 - 0.0588) < 1e-3);
});

test('三原理与三原则：六条全部在原文出现（不凭记忆）', () => {
  const p = principles();
  assert.strictEqual(p.principles.length, 3);
  assert.strictEqual(p.rules.length, 3);
  assert.ok(p.principles.every((x) => x.inText), '三原理应全部命中');
  assert.ok(p.rules.every((x) => x.inText), '三原则应全部命中');
});

test('教材章序与课程 12 章不是一一对应（教材 14 章含经络/三焦/平台）', () => {
  assert.ok(chapter('9').title.includes('经络'));
  assert.ok(chapter('12').title.includes('三焦'));
  assert.ok(chapter('14').title.includes('平台') || chapter('14').title.includes('AI'));
});
