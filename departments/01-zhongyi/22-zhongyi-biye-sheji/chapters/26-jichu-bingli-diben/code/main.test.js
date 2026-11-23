#!/usr/bin/env node
/**
 * 第 26 章 最大的底本层，先证明它可被别人复用 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '26-jichu-bingli-diben';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('规模：252 单元 / 428,867 字，每单元 1,701.9 字', () => {
  assert.strictEqual(rows.get('单元'), 252);
  assert.strictEqual(rows.get('汉字'), 428867);
  assert.strictEqual(Number((428867 / 252).toFixed(1)), 1701.9);
});

test('原课已建 10 章，252 ÷ 10 = 25.2 单元/章', () => {
  assert.strictEqual(rows.get('原课已建'), 10);
  assert.strictEqual(Number((252 / 10).toFixed(1)), 25.2);
});

test('复用判据：失败率与复用率都能由台账算出', () => {
  assert.ok(doc.includes('失败率'));
  assert.ok(doc.includes('复用率'));
});

test('案例预算：回本 41.4 个月、三年收入 576,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 41.4);
  assert.strictEqual(b.threeRevenue, 576000);
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
