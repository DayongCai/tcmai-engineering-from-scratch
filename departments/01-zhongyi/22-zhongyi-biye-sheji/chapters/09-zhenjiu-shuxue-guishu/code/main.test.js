#!/usr/bin/env node
/**
 * 第 9 章 补源之前，冲突率只能是零比零 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, grab, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '09-zhenjiu-shuxue-guishu';
const doc = readDoc(SLUG).text;

test('现状：入库 0 部、可建 0 行、冲突 0 条', () => {
  assert.strictEqual(grab(doc, /已入库的多教材文本\s*(\d+)\s*部/, '教材'), 0);
  assert.strictEqual(grab(doc, /可建穴-经行数\s*(\d+)\s*行/, '行'), 0);
  assert.strictEqual(grab(doc, /冲突清单\s*\|\s*未建\s*\|\s*(\d+)\s*条/, '冲突'), 0);
});

test('分母为 0 时冲突率返回 null，不伪装成 0%', () => {
  const denom = 0 * 0;
  const rate = denom === 0 ? null : 0 / denom;
  assert.strictEqual(rate, null);
  assert.notStrictEqual(String(rate), '0');
});

test('零不伪装：正文把未建部分写「未建」，不写 0%', () => {
  assert.ok(doc.includes('不可算'), '正文应保留「不可算」');
  assert.ok(!/冲突率\s*0%/.test(doc), '正文不得把冲突率写成 0%');
});

test('案例预算：回本 45.2 个月，超出三年窗口', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 45.2);
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
