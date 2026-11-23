#!/usr/bin/env node
/**
 * 第 22 章 只报均值，等于把失败藏进平均里 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '22-zhineng-zhibiao-shibai';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('门禁模板 6 项，必报三层指标', () => {
  assert.strictEqual(rows.get('门禁模板'), 6);
  assert.ok(doc.includes('mean') && doc.includes('p50') && doc.includes('最差 10'));
});

test('失效条目下限 10 条，占评测集 20 条的 50%', () => {
  assert.strictEqual(10 / 20, 0.5);
  assert.ok(doc.includes('不少于十条'));
});

test('失效四要素：查询、预期、实际、原因', () => {
  for (const k of ['查询、预期、实际、原因', '四要素']) assert.ok(doc.includes(k), k);
});

test('案例预算：回本 24.1 个月、三年收入 700,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 24.1);
  assert.strictEqual(b.threeRevenue, 700000);
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
