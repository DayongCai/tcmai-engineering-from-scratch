#!/usr/bin/env node
/**
 * 第 7 章 难度图谱是代理指标，不能替老师判难 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '07-zhongyao-yaoli-nandu';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('层级母体：49 章 / 196 节 / 588 小节 / 7,455 段', () => {
  assert.strictEqual(rows.get('章'), 49);
  assert.strictEqual(rows.get('节'), 196);
  assert.strictEqual(rows.get('小节'), 588);
  assert.strictEqual(rows.get('段'), 7455);
});

test('每章 4.0 节、每节 3.0 小节、每小节 12.7 段', () => {
  assert.strictEqual(Number((196 / 49).toFixed(1)), 4.0);
  assert.strictEqual(Number((588 / 196).toFixed(1)), 3.0);
  assert.strictEqual(Number((7455 / 588).toFixed(1)), 12.7);
});

test('每小节 1,651.7 字、0.72 个数值', () => {
  assert.strictEqual(rows.get('汉字'), 971179);
  assert.strictEqual(rows.get('数值'), 421);
  assert.strictEqual(Number((971179 / 588).toFixed(1)), 1651.7);
  assert.strictEqual(Number((421 / 588).toFixed(2)), 0.72);
});

test('案例预算：回本 60.3 个月，超出三年窗口', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 60.3);
  assert.ok(b.payback > 36);
});

test('quiz 结构：≥5 题、三段齐、4 选项、explain ≥30 汉字', () => {
  const audit = auditQuiz(SLUG, doc);
  assert.strictEqual(audit.problems.length, 0, audit.problems.join('；'));
  assert.ok(audit.qs.length >= 5);
  assert.deepStrictEqual([...audit.stages].sort(), ['check', 'post', 'pre']);
  for (const q of audit.qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
  }
});

test('quiz 接地 ≥2 道，答案位分散', () => {
  const audit = auditQuiz(SLUG, doc);
  assert.ok(audit.grounded >= 2, `接地仅 ${audit.grounded} 道`);
  assert.ok(new Set(audit.spread).size >= 3, `答案位过于集中：${audit.spread.join(',')}`);
});
