#!/usr/bin/env node
/**
 * 第 13 章 缺项填零，量表就成了假分数 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '13-gushang-kangfu-pingding';
const doc = readDoc(SLUG).text;

/** 与 main.js 同口径：不适用与缺项分开，低于阈值不出总分 */
function scoreOf(items, threshold = 0.8) {
  const applicable = items.filter((x) => x.applicable !== false);
  const rated = applicable.filter((x) => x.missing !== true);
  const rate = applicable.length ? rated.length / applicable.length : 0;
  if (rate < threshold) return { total: null, rate, evaluable: false };
  return { total: rated.reduce((a, x) => a + x.score, 0), rate, evaluable: true };
}

test('可复现包四件、门禁三条', () => {
  for (const x of ['数据', '脚本', '门禁', 'README']) assert.ok(doc.includes(x), x);
  assert.ok(doc.includes('门禁一') && doc.includes('门禁二') && doc.includes('门禁三'));
});

test('十项缺三项：可评率 70%，低于阈值不出总分', () => {
  const items = [
    { score: 2 }, { score: 1 }, { score: 3 }, { score: 0 }, { score: 2 },
    { score: 1 }, { score: 3 }, { missing: true }, { missing: true }, { missing: true },
  ];
  const r = scoreOf(items);
  assert.strictEqual(r.rate, 0.7);
  assert.strictEqual(r.total, null);
  assert.strictEqual(r.evaluable, false);
});

test('缺项填 0 会得到一个看似正常的假总分 12', () => {
  const items = [
    { score: 2 }, { score: 1 }, { score: 3 }, { score: 0 }, { score: 2 },
    { score: 1 }, { score: 3 }, { missing: true }, { missing: true }, { missing: true },
  ];
  assert.strictEqual(items.reduce((a, x) => a + (x.score || 0), 0), 12);
});

test('不适用不算缺项，可评率只按适用条目算', () => {
  const r = scoreOf([{ score: 2 }, { score: 2, applicable: false }], 0.8);
  assert.strictEqual(r.rate, 1);
  assert.strictEqual(r.total, 2);
});

test('案例预算：回本 9.2 个月、三年收入 2,880,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 9.2);
  assert.strictEqual(b.threeRevenue, 2880000);
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
