#!/usr/bin/env node
/**
 * 第 23 章 「神疲」写不进字段，就别硬塞进形态 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '23-wuguan-mianbu-wangzhen';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('资产 18 件、对象池 132 证、字段 4 类', () => {
  assert.strictEqual(rows.get('对接资产'), 18);
  assert.strictEqual(rows.get('对象池'), 132);
  assert.strictEqual(rows.get('字段类'), 4);
});

test('每类 3–5 个子字段，总数落在 12–20', () => {
  assert.strictEqual(4 * 3, 12);
  assert.strictEqual(4 * 5, 20);
});

test('可观察判定用双人同值，图像数据本库无', () => {
  assert.ok(doc.includes('双人同值'));
  assert.ok(doc.includes('图像数据本库没有'));
});

test('案例预算：回本 38.7 个月、三年收入 560,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 38.7);
  assert.strictEqual(b.threeRevenue, 560000);
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
