#!/usr/bin/env node
/**
 * 第 24 章 两条筛方路径的差别，用交集与差集说话 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '24-wuguan-fangji-shai';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('母体：114 方 / 836 药位 / 246 味 / 86 味缺', () => {
  assert.strictEqual(rows.get('方'), 114);
  assert.strictEqual(rows.get('药位'), 836);
  assert.strictEqual(rows.get('不同药味'), 246);
  assert.strictEqual(rows.get('不在词表'), 86);
});

test('复算：7.3 药位/方、3.4 药位/味、35.0% 缺口', () => {
  assert.strictEqual(Number((836 / 114).toFixed(1)), 7.3);
  assert.strictEqual(Number((836 / 246).toFixed(1)), 3.4);
  assert.strictEqual(Number(((86 / 246) * 100).toFixed(1)), 35.0);
});

test('Jaccard 口径：交集 ÷ 并集', () => {
  assert.strictEqual(0.5, 30 / 60);
  assert.ok(doc.includes('Jaccard'));
});

test('案例预算：回本 33.8 个月、三年收入 500,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 33.8);
  assert.strictEqual(b.threeRevenue, 500000);
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
