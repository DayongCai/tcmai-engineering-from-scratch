#!/usr/bin/env node
/**
 * 第 4 章 四十九万字里，先分清是哪一个范畴的密度 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '04-zhongyi-zhexue-fanchou';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);
const density = (n) => Number(((n / rows.get('汉字')) * 10000).toFixed(1));

test('母体：162 篇、490,232 汉字', () => {
  assert.strictEqual(rows.get('篇'), 162);
  assert.strictEqual(rows.get('汉字'), 490232);
});

test('四范畴次数与每万字密度：221.4 / 30.2 / 2.6 / 0.6', () => {
  assert.strictEqual(rows.get('气'), 10855);
  assert.strictEqual(density(rows.get('气')), 221.4);
  assert.strictEqual(density(rows.get('道')), 30.2);
  assert.strictEqual(density(rows.get('五行')), 2.6);
  assert.strictEqual(density(rows.get('临床')), 0.6);
});

test('复算：10,855÷129=84.1 倍', () => {
  assert.strictEqual(Number((rows.get('气') / rows.get('五行')).toFixed(1)), 84.1);
});

test('案例预算：回本 90.3 个月，是 27 案里最慢的一档', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 90.3);
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
