#!/usr/bin/env node
/**
 * 第 14 章 一证多护不是缺陷，是护理评估的常态 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '14-huli-pinggu-diben';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('母体：132 证 / 14 族 / 208 次覆盖', () => {
  assert.strictEqual(rows.get('证'), 132);
  assert.strictEqual(rows.get('族'), 14);
  assert.strictEqual(rows.get('病证覆盖'), 208);
});

test('复算：132÷14=9.4 证/族，208÷132=1.58 次覆盖/证', () => {
  assert.strictEqual(Number((132 / 14).toFixed(1)), 9.4);
  assert.strictEqual(Number((208 / 132).toFixed(2)), 1.58);
});

test('映射表保留丢失的鉴别点，不自称对接标准', () => {
  assert.ok(doc.includes('丢失的鉴别点'));
  assert.ok(doc.includes('自建分类'));
});

test('案例预算：回本 8 个月、三年收入 3,240,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 8);
  assert.strictEqual(b.threeRevenue, 3240000);
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
