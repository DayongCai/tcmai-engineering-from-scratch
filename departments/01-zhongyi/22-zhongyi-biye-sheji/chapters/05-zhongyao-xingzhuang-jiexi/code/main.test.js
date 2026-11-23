#!/usr/bin/env node
/**
 * 第 5 章 药表的价值在缺项说得清，不在味数多 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '05-zhongyao-xingzhuang-jiexi';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('三字段计数：287 味，带气 287、带味 285、带归经 284', () => {
  assert.strictEqual(rows.get('药味'), 287);
  assert.strictEqual(rows.get('带气'), 287);
  assert.strictEqual(rows.get('带味'), 285);
  assert.strictEqual(rows.get('带归经'), 284);
});

test('严格规则未解析 0 条，字段缺口 5 个', () => {
  assert.strictEqual(rows.get('严格规则未解析'), 0);
  const gaps = 287 * 3 - (287 + 285 + 284);
  assert.strictEqual(gaps, 5);
});

test('字段占比：带味 99.3%、带归经 98.9%、可用率 99.42%', () => {
  assert.strictEqual(((285 / 287) * 100).toFixed(1), '99.3');
  assert.strictEqual((Math.floor((284 / 287) * 1000) / 10).toFixed(1), '98.9');
  assert.strictEqual(((856 / 861) * 100).toFixed(2), '99.42');
});

test('案例预算：回本 36.2 个月，恰在三年窗口边缘', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 36.2);
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
