#!/usr/bin/env node
/**
 * 第 1 章 通用流程与基本要求 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言钉住正文锚点重算后的实测值，并复核 quiz.json 的结构与接地。
 * 正文改数时测试先响，提醒回来重算，而不是让旧值静默过期。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');

const { readDoc, auditQuiz } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '01-tongyong-liucheng';
const doc = readDoc(SLUG).text;
const num = (re, label) => {
  const m = doc.match(re);
  assert.ok(m, '正文缺少锚点：' + label);
  return Number(m[1].replace(/,/g, ''));
};

const total = num(/(\d+)\s*个案例里/, '案例总数');
const missing = num(/个案例里\s*(\d+)\s*个缺底本/, '缺底本案数');
const debt = num(/占位\s*¥([\d,]+)/, '欠账占位金额');
const fine = num(/细口径\s*¥([\d,]+)/, '细口径合计');
const coarse = num(/粗口径\s*¥([\d,]+)/, '粗口径合计');
const statedGap = num(/相差\s*[−-]\s*([\d.]+)%/, '两口径差幅');

test('案例口径：27 案 = 可计 16 + 缺底本 11', () => {
  assert.strictEqual(total, 27);
  assert.strictEqual(missing, 11);
  assert.strictEqual(total - missing, 16);
});

test('欠账占位 881,400 元，每案 80,127.3 元', () => {
  assert.strictEqual(debt, 881400);
  assert.strictEqual(Number((debt / missing).toFixed(1)), 80127.3);
});

test('可计 16 案的两种口径均值分别为 45,459.8 与 82,400 元', () => {
  assert.strictEqual(fine, 727356);
  assert.strictEqual(coarse, 1318400);
  assert.strictEqual(Number((fine / 16).toFixed(1)), 45459.8);
  assert.strictEqual(coarse / 16, 82400);
});

test('两口径差幅复算为 −44.8%，与正文一致', () => {
  const gap = ((fine - coarse) / coarse) * 100;
  assert.strictEqual(Number(gap.toFixed(1)), -44.8);
  assert.strictEqual(statedGap, 44.8);
});

test('quiz 结构：≥5 题、三段齐、每题 4 选项且 explain ≥30 汉字', () => {
  const audit = auditQuiz(SLUG, doc);
  assert.strictEqual(audit.problems.length, 0, audit.problems.join('；'));
  assert.ok(audit.qs.length >= 5);
  assert.deepStrictEqual([...audit.stages].sort(), ['check', 'post', 'pre']);
  for (const q of audit.qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
  }
});

test('quiz 接地：至少 2 道 check 题正确选项能在正文找到原词，且答案位不单一', () => {
  const audit = auditQuiz(SLUG, doc);
  assert.ok(audit.grounded >= 2, `接地仅 ${audit.grounded} 道`);
  assert.ok(new Set(audit.spread).size >= 3, `答案位过于集中：${audit.spread.join(',')}`);
});
