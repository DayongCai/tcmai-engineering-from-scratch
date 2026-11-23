#!/usr/bin/env node
/**
 * 第 28 章 正常值没有单位，等于没有参考区间 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '28-jichu-shengli-zhengchangzhi';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('规模：132 单元 / 228,672 字，均值 1,732.4 字', () => {
  assert.strictEqual(rows.get('单元'), 132);
  assert.strictEqual(rows.get('汉字'), 228672);
  assert.strictEqual(Number((228672 / 132).toFixed(1)), 1732.4);
});

test('必填三件 × 132 单元 = 396 个字段值', () => {
  assert.strictEqual(132 * 3, 396);
  assert.ok(doc.includes('数值、单位、区间'));
});

test('不一致三源与区间写法都在正文', () => {
  for (const k of ['教材本身不统一', '抽取误差', '版本差异', '单侧']) assert.ok(doc.includes(k), k);
});

test('案例预算：回本 13.7 个月、三年收入 1,980,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 13.7);
  assert.strictEqual(b.threeRevenue, 1980000);
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
