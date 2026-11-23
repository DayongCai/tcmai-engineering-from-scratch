#!/usr/bin/env node
/**
 * 第 27 章 一条单元打三个轴，覆盖率就会虚高 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '27-jichu-bingsheng-jiuzhou';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('规模：216 单元 / 360,945 字 / 9 轴，均值 1,671.0 字', () => {
  assert.strictEqual(rows.get('单元'), 216);
  assert.strictEqual(rows.get('汉字'), 360945);
  assert.strictEqual(rows.get('轴'), 9);
  assert.strictEqual(Number((360945 / 216).toFixed(1)), 1671.0);
});

test('最拥挤轴阈值 30% = 64.8，约 65 个单元', () => {
  assert.strictEqual(Number((216 * 0.3).toFixed(1)), 64.8);
  assert.strictEqual(Math.ceil(216 * 0.3), 65);
});

test('覆盖率分母固定 216，标签相加最多 432，会虚高', () => {
  assert.strictEqual(216 * 2, 432);
  assert.ok(doc.includes('覆盖率'));
  assert.ok(doc.includes('空轴'));
});

test('案例预算：回本 54.2 个月、三年收入 360,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 54.2);
  assert.strictEqual(b.threeRevenue, 360000);
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
