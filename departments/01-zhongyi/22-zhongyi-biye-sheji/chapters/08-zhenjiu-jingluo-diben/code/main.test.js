#!/usr/bin/env node
/**
 * 第 8 章 底本从零建，先算「还没有的东西」值多少 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, grab, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '08-zhenjiu-jingluo-diben';
const doc = readDoc(SLUG).text;

test('参照端：384 单元 / 329,826 字，均值 858.9 字/单元', () => {
  const units = grab(doc, /参照口径\s*(\d+)\s*单元/, '单元');
  const hanziTotal = grab(doc, /单元、\s*([\d,]+)\s*汉字/, '汉字');
  assert.strictEqual(units, 384);
  assert.strictEqual(hanziTotal, 329826);
  assert.strictEqual(Number((hanziTotal / units).toFixed(1)), 858.9);
});

test('单元计价：384 × 60 元 = 23,040 元', () => {
  assert.strictEqual(384 * 60, 23040);
});

test('两价相差 4.7 倍：107,400 ÷ 23,040', () => {
  const debt = grab(doc, /欠账清单记\s*([\d,]+)\s*元占位/, '欠账');
  assert.strictEqual(debt, 107400);
  assert.strictEqual(Number((debt / 23040).toFixed(1)), 4.7);
});

test('案例预算：回本 10.7 个月、三年收入 3,132,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 10.7);
  assert.strictEqual(b.threeRevenue, 3132000);
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
