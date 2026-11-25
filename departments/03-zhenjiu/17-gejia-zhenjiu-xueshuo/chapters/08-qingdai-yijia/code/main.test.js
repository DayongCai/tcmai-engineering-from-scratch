#!/usr/bin/env node
/**
 * 第 8 章 清代针灸医家学术思想 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言的是「习题与正文同源」这份契约：题型配比、解释长度、check 题的正文原句接地，
 * 以及单元层统计可复算。改 quiz 或改正文而不同步，这里先红。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { CHAPTER, SLUG, chapterKeys, chapterUnits, summarize, selfCheck, load } = require('./main.js');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');
const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const onlyHanzi = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
function grams(text, n) {
  const clean = onlyHanzi(text);
  const out = new Set();
  for (let i = 0; i + n <= clean.length; i += 1) out.add(clean.slice(i, i + n));
  return out;
}

test('章节常量与 quiz 元数据一致', () => {
  assert.strictEqual(CHAPTER, '8');
  assert.strictEqual(SLUG, '08-qingdai-yijia');
  assert.strictEqual(quiz.lesson, SLUG);
});

test('单元映射来自单元层，且都属本章', () => {
  const keys = chapterKeys();
  const units = chapterUnits();
  assert.ok(keys.length > 0, '本章在单元层没有单元');
  assert.deepStrictEqual(units.map((u) => u.sub), keys);
  for (const u of units) assert.strictEqual(u.chapter, CHAPTER);
});

test('规模与单元层逐项对得上', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(s.units, units.length);
  assert.strictEqual(s.hanzi, units.reduce((a, u) => a + u.hanzi, 0));
  assert.ok(s.hanzi > 5000, `本章汉字过少：${s.hanzi}`);
  assert.ok(s.views && Object.keys(s.views).length > 0);
  assert.ok(s.levels && Object.keys(s.levels).length > 0);
});

test('习题结构：6 题，pre 1 / check 3 / post 2', () => {
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const count = (s) => qs.filter((q) => q.stage === s).length;
  assert.strictEqual(count('pre'), 1);
  assert.strictEqual(count('check'), 3);
  assert.strictEqual(count('post'), 2);
});

test('每题 4 选项且 correct 为合法下标', () => {
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    assert.ok(q.question && q.question.length > 6, '题干过短');
  }
});

test('每题解释 40–80 汉字', () => {
  for (const q of quiz.questions) {
    const n = hz(q.explain || q.explanation);
    assert.ok(n >= 40 && n <= 80, `${q.question} 解释 ${n} 汉字`);
  }
});

test('三道 check 题的正确选项都能在正文里找到 ≥6 汉字原句', () => {
  const body = grams(doc, 6);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const q of checks) {
    const right = onlyHanzi(q.options[q.correct]);
    let hit = '';
    for (let i = 0; i + 6 <= right.length; i += 1) {
      if (body.has(right.slice(i, i + 6))) { hit = right.slice(i, i + 6); break; }
    }
    assert.ok(hit, `${q.question} 的正确选项不在正文原句里`);
  }
});

test('quiz 用 explain 字段，且解释不是指向脚本输出的空话', () => {
  for (const q of quiz.questions) {
    assert.strictEqual(typeof q.explain, 'string', q.question);
    assert.strictEqual(q.explanation, undefined, `${q.question} 仍用旧字段 explanation`);
    assert.ok(!/code\/main\.js/.test(q.explain), q.question);
  }
});

test('selfCheck 通过，且 node code/main.js 退出码为 0', () => {
  assert.deepStrictEqual(selfCheck().issues, []);
  const r = spawnSync(process.execPath, [path.join(DIR, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /自检通过/);
  assert.match(r.stdout, /不构成诊疗建议/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(path.join(DIR, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/08-qingdai-yijia/docs/zh.md'), '头部注释未指向本章');
});
