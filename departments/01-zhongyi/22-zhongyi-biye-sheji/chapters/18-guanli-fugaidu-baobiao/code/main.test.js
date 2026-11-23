#!/usr/bin/env node
/**
 * 第 18 章 一个覆盖率会把「章节多」读成「底本齐」 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '18-guanli-fugaidu-baobiao';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('一维：405 ÷ 2,115 = 19.1%', () => {
  assert.strictEqual(rows.get('已建章节'), 405);
  assert.strictEqual(rows.get('目标章节'), 2115);
  assert.strictEqual(Number(((405 / 2115) * 100).toFixed(1)), 19.1);
});

test('结构：中医系 208 + 基础医学院 134 = 342 章', () => {
  assert.strictEqual(rows.get('中医系已建'), 208);
  assert.strictEqual(rows.get('基础医学院已建'), 134);
  assert.strictEqual(208 + 134, 342);
});

test('两系占已建章节 84.4%，说明总量集中在两系', () => {
  assert.strictEqual(Number(((342 / 405) * 100).toFixed(1)), 84.4);
});

test('案例预算：回本 38.4 个月，超出三年窗口', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 38.4);
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
