#!/usr/bin/env node
/**
 * 第 17 章 对不上的数不是笔误，是没有人负责计数 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '17-guanli-tongji-diben';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('四项现算口径：9 / 187 / 2,093 / 11,457', () => {
  assert.strictEqual(rows.get('院系'), 9);
  assert.strictEqual(rows.get('学科'), 187);
  assert.strictEqual(rows.get('章节目标'), 2093);
  assert.strictEqual(rows.get('学时'), 11457);
});

test('复算：11.19 章/学科、5.47 学时/章', () => {
  assert.strictEqual(Number((2093 / 187).toFixed(2)), 11.19);
  assert.strictEqual(Number((11457 / 2093).toFixed(2)), 5.47);
});

test('差异示例：文件 185、现算 187，差 +2', () => {
  assert.strictEqual(187 - 185, 2);
  assert.ok(doc.includes('文件落后'));
});

test('案例预算：回本 9.2 个月、三年收入 2,236,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 9.2);
  assert.strictEqual(b.threeRevenue, 2236000);
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
