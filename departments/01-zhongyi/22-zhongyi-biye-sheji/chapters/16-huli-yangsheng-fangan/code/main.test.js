#!/usr/bin/env node
/**
 * 第 16 章 忌比宜难写，因为「忌」必须能勾选 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '16-huli-yangsheng-fangan';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('对象池：132 证，每证 2 忌 2 宜，共 528 条', () => {
  assert.strictEqual(rows.get('证'), 132);
  assert.strictEqual(rows.get('每证忌条'), 2);
  assert.strictEqual(rows.get('每证宜条'), 2);
  assert.strictEqual(rows.get('需判据条目'), 528);
  assert.strictEqual(132 * (2 + 2), 528);
});

test('忌与宜各占 50%，与 2 忌 2 宜的设定一致', () => {
  assert.strictEqual(((132 * 2) / 528) * 100, 50);
});

test('可勾选率未统计，不编比例', () => {
  assert.ok(doc.includes('待统计'));
  assert.ok(doc.includes('可勾选率'));
});

test('案例预算：回本 6.3 个月、三年收入 3,360,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 6.3);
  assert.strictEqual(b.threeRevenue, 3360000);
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
