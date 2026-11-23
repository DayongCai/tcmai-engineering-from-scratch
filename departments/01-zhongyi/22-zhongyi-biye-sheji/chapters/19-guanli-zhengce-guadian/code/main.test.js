#!/usr/bin/env node
/**
 * 第 19 章 条文没登记来源，挂上去也是无出处 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, grab, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '19-guanli-zhengce-guadian';
const doc = readDoc(SLUG).text;

test('现状：政策全文 0 条、已登记 0 份、登记字段至少 3 项', () => {
  assert.strictEqual(grab(doc, /政策全文\s*\|\s*(\d+)\s*条/, '全文'), 0);
  assert.strictEqual(grab(doc, /已登记文书\s*\|\s*(\d+)\s*份/, '登记'), 0);
  assert.strictEqual(grab(doc, /登记字段\s*\|\s*至少\s*(\d+)\s*项/, '字段'), 3);
});

test('覆盖率 0÷0 不可算，不写百分比', () => {
  const clauses = 0;
  const coverage = clauses === 0 ? null : 0 / clauses;
  assert.strictEqual(coverage, null);
  assert.ok(doc.includes('不可算'));
});

test('登记三项：发文机关、文号、文件校验值', () => {
  for (const k of ['发文机关', '文号', '校验值']) assert.ok(doc.includes(k), k);
});

test('案例预算：回本 36.2 个月，恰在三年窗口边缘', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 36.2);
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
