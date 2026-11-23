#!/usr/bin/env node
/**
 * 第 12 章 教材不给时点，就别替它编一个 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, grab, budget, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '12-gushang-chuangshang-shijianchuang';
const doc = readDoc(SLUG).text;

test('母体：48 单元 / 151,733 字，均值 3,161.1 字/单元', () => {
  const units = grab(doc, /急救教材\s*(\d+)\s*单元/, '单元');
  const hanziTotal = grab(doc, /单元、\s*([\d,]+)\s*汉字/, '汉字');
  assert.strictEqual(units, 48);
  assert.strictEqual(hanziTotal, 151733);
  assert.strictEqual(Number((hanziTotal / units).toFixed(1)), 3161.1);
});

test('全库数值为 0，抽数字只能得到空表', () => {
  assert.strictEqual(grab(doc, /全库数值为\s*(\d+)/, '数值'), 0);
  assert.strictEqual(0, 0);
});

test('中文时间词表覆盖三类以上，模糊类单列', () => {
  for (const w of ['即刻', '数分钟', '数小时', '数日']) assert.ok(doc.includes(w), w);
  assert.ok(doc.includes('模糊表述'));
});

test('案例预算：回本 8.5 个月、三年收入 1,976,000', () => {
  const b = budget(SLUG);
  assert.deepStrictEqual(b.mismatch, []);
  assert.strictEqual(b.payback, 8.5);
  assert.strictEqual(b.threeRevenue, 1976000);
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
