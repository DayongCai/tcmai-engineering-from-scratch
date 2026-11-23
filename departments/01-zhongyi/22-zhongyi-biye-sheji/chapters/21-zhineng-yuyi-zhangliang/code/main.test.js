#!/usr/bin/env node
/**
 * 第 21 章 换一种坐标表示，近邻集合先要稳住 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '21-zhineng-yuyi-zhangliang';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);
const k = 10;
const jaccard = (same) => same / (2 * k - same);

test('资产 8 项，k 建议 10，查询不少于 20', () => {
  assert.strictEqual(rows.get('semtensor 目录'), 8);
  assert.ok(doc.includes('建议 10'), '正文应给出 k 建议值');
  assert.ok(doc.includes('建议不少于 20'), '正文应给出查询条数下限');
});

test('k=10 时 1 条邻居互换，Jaccard = 9 ÷ 11 = 0.818', () => {
  assert.strictEqual(Number(jaccard(9).toFixed(3)), 0.818);
});

test('k=10 时 2 条互换，Jaccard = 8 ÷ 12 = 0.667', () => {
  assert.strictEqual(Number(jaccard(8).toFixed(3)), 0.667);
});

test('案例预算：回本 27.1 个月、三年收入 800,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 27.1);
  assert.strictEqual(b.threeRevenue, 800000);
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
