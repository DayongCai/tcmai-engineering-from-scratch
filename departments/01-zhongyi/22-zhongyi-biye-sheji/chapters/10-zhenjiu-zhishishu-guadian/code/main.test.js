#!/usr/bin/env node
/**
 * 第 10 章 挂点覆盖率的分母没建起来之前，分子毫无意义 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, grab, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '10-zhenjiu-zhishishu-guadian';
const doc = readDoc(SLUG).text;

test('现状：骨架已入库、条文 0 条、挂点表 0 行', () => {
  assert.strictEqual(grab(doc, /条文层\s*\|\s*未建\s*\|\s*(\d+)\s*条/, '条文'), 0);
  assert.ok(doc.includes('五级骨架'));
  assert.ok(doc.includes('挂点表'));
});

test('覆盖率 0÷0 返回 null，不能写成 0% 或 100%', () => {
  const clauses = 0;
  const coverage = clauses === 0 ? null : 0 / clauses;
  assert.strictEqual(coverage, null);
  assert.ok(doc.includes('不可算'));
});

test('抽样方案：20 条 ÷ 5 级 = 每级 4 条', () => {
  assert.strictEqual(20 / 5, 4);
});

test('案例预算：回本 54.2 个月，超出三年窗口', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 54.2);
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
