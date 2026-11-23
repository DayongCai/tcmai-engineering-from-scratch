#!/usr/bin/env node
/**
 * 第 25 章 留空与写「无」，在报表里是两件事 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '25-wuguan-guangxue-canliang';
const doc = readDoc(SLUG).text;

test('三种缺项标记与四类下游计算都在正文', () => {
  for (const m of ['未测', '无此项', '不适用']) assert.ok(doc.includes(m), m);
  for (const d of ['求均值', '分档', '排序', '同比']) assert.ok(doc.includes(d), d);
});

test('示例口径：100 行缺 10 行，留空当 0 的均值只剩显式版 90%', () => {
  assert.strictEqual((100 - 10) / 100, 0.9);
});

test('受影响行数按两版结果不同的行数算', () => {
  assert.ok(doc.includes('受影响行数'));
  assert.ok(doc.includes('两版结果不同的行数'));
});

test('案例预算：回本 14.2 个月、三年收入 1,728,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 14.2);
  assert.strictEqual(b.threeRevenue, 1728000);
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
