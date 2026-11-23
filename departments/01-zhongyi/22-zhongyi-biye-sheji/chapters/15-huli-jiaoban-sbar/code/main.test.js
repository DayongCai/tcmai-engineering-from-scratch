#!/usr/bin/env node
/**
 * 第 15 章 交接班留空不是省事，是把风险留给下一班 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, grab, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '15-huli-jiaoban-sbar';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('口径：38 病 / 190 动作 / 5 栏，每病 5.0 个动作', () => {
  assert.strictEqual(rows.get('病'), 38);
  assert.strictEqual(rows.get('动作'), 190);
  assert.strictEqual(rows.get('五栏'), 5);
  assert.strictEqual(Number((190 / 38).toFixed(1)), 5.0);
});

test('台账示例：应填 12、实填 9，留空率 25%', () => {
  assert.strictEqual(grab(doc, /应填项\s*\|[^|]*\|\s*(\d+)/, '应填'), 12);
  assert.strictEqual(grab(doc, /实填项\s*\|[^|]*\|\s*(\d+)/, '实填'), 9);
  assert.strictEqual(((12 - 9) / 12) * 100, 25);
});

test('「无」占比 16.7%、未获取占比 8.3%', () => {
  assert.strictEqual(Number(((2 / 12) * 100).toFixed(1)), 16.7);
  assert.strictEqual(Number(((1 / 12) * 100).toFixed(1)), 8.3);
});

test('案例预算：回本 7.7 个月、三年收入 2,640,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 7.7);
  assert.strictEqual(b.threeRevenue, 2640000);
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
