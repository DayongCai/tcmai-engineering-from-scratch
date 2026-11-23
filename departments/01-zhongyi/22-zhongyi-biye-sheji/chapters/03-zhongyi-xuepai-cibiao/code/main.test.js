#!/usr/bin/env node
/**
 * 第 3 章 一词命中一千四百次，证的是字频不是学派 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, grab, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '03-zhongyi-xuepai-cibiao';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('母体：伤寒 1,760 ＋ 金匮 402 ＋ 温病 630 = 2,792 条', () => {
  assert.strictEqual(rows.get('伤寒'), 1760);
  assert.strictEqual(rows.get('金匮'), 402);
  assert.strictEqual(rows.get('温病'), 630);
  assert.strictEqual(rows.get('合计'), 2792);
});

test('八派命中区间 7–1,476，相差约 211 倍', () => {
  const top = grab(doc, /八派的命中从\s*[\d,]+\s*到\s*([\d,]+)/, '最高命中');
  const low = grab(doc, /八派的命中从\s*([\d,]+)\s*到/, '最低命中');
  assert.strictEqual(top, 1476);
  assert.strictEqual(low, 7);
  assert.strictEqual(Number((top / low).toFixed(1)), 210.9);
});

test('复算：1,476÷2,792=52.9%，7÷2,792=0.25%', () => {
  assert.strictEqual(Number(((1476 / 2792) * 100).toFixed(1)), 52.9);
  assert.strictEqual(Number(((7 / 2792) * 100).toFixed(2)), 0.25);
});

test('案例预算：回本 70.4 个月，超出三年窗口', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 70.4);
  assert.ok(b.payback > 36);
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
