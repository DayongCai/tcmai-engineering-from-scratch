#!/usr/bin/env node
/**
 * 第 11 章 底本可以迁移，章轴必须重算 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '11-gushang-gubing-qianyi';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('母体：60 单元 / 149,316 字，均值 2,488.6 字/单元', () => {
  assert.strictEqual(rows.get('单元'), 60);
  assert.strictEqual(rows.get('汉字'), 149316);
  assert.strictEqual(Number((149316 / 60).toFixed(1)), 2488.6);
});

test('四轴不均衡度：17.5 / 5.9 / 5.6 / 2.2', () => {
  assert.strictEqual(rows.get('轴一（解剖部位）'), 17.5);
  assert.strictEqual(rows.get('轴二（病名序列）'), 5.9);
  assert.strictEqual(rows.get('轴三（治法分类）'), 5.6);
  assert.strictEqual(rows.get('轴四（病性四分）'), 2.2);
});

test('最不均与最均相差约 8 倍：17.5 ÷ 2.2', () => {
  assert.strictEqual(Number((17.5 / 2.2).toFixed(1)), 8.0);
});

test('迁移完整率必须等于 1，等于 60 ÷ 60', () => {
  assert.strictEqual(60 / 60, 1);
  assert.notStrictEqual(58 / 60, 1);
});

test('案例预算：回本 10.7 个月、三年收入 2,052,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 10.7);
  assert.strictEqual(b.threeRevenue, 2052000);
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
