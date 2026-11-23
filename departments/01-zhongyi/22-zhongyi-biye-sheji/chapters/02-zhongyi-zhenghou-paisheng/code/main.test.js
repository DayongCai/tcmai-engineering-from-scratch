#!/usr/bin/env node
/**
 * 第 2 章 证候词表的价值在可归并，不在证名多 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, tableMap, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '02-zhongyi-zhenghou-paisheng';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

test('母体：三底本合计 900 单元', () => {
  assert.strictEqual(rows.get('单元'), 900);
  const m = doc.match(/外科\s*(\d+)\s*＋\s*儿科\s*(\d+)\s*＋\s*妇科\s*(\d+)/);
  assert.ok(m);
  assert.strictEqual(Number(m[1]) + Number(m[2]) + Number(m[3]), 900);
});

test('派生规模：132 证 / 14 族 / 208 次覆盖', () => {
  assert.strictEqual(rows.get('证'), 132);
  assert.strictEqual(rows.get('族'), 14);
  assert.strictEqual(rows.get('病证覆盖'), 208);
});

test('复算：208÷132=1.58 次/证，132÷14=9.4 证/族', () => {
  assert.strictEqual(Number((208 / 132).toFixed(2)), 1.58);
  assert.strictEqual(Number((132 / 14).toFixed(1)), 9.4);
});

test('「其他」族 8.3% 折合约 11 证，低于 10% 红线', () => {
  assert.strictEqual(rows.get('「其他」族'), 8.3);
  assert.strictEqual(Number((132 * 0.083).toFixed(1)), 11.0);
  assert.ok(8.3 < 10);
});

test('案例预算：回本 5.9 个月、三年收入 4,698,000、毛利 4,580,700', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 5.9);
  assert.strictEqual(b.threeRevenue, 4698000);
  assert.strictEqual(b.gross, 4580700);
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
