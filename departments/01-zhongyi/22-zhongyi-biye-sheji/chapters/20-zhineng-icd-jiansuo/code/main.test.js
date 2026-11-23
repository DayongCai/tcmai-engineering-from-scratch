#!/usr/bin/env node
/**
 * 第 20 章 检索栈能重建，才算编码翻译层 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '20-zhineng-icd-jiansuo';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('资产 8 件，查询集 20 条', () => {
  assert.strictEqual(rows.get('ICD-11 资产'), 8);
  assert.strictEqual(rows.get('查询集'), 20);
});

test('每命中 1 条 = 5% 召回', () => {
  assert.strictEqual(100 / 20, 5);
});

test('基线与消融各是关键词与向量检索', () => {
  assert.ok(doc.includes('关键词检索'));
  assert.ok(doc.includes('向量检索'));
});

test('案例预算：回本 7.8 个月、三年收入 3,720,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 7.8);
  assert.strictEqual(b.threeRevenue, 3720000);
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
