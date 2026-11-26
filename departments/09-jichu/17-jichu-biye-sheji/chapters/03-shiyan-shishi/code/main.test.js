#!/usr/bin/env node
/**
 * 第 3 章 正文与习题自检 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const main = require('./main.js');
const { CHAPTER, SLUG, TITLE, DOC, QUIZ, chapterKeys, chapterUnits, summarize, audit, grounded, hanzi, why, doc, quiz, bodyText } = main;

const MAIN = path.join(__dirname, 'main.js');

test('原导出齐备：chapterKeys / chapterUnits / summarize / CHAPTER / SLUG', () => {
  for (const k of ['chapterKeys', 'chapterUnits', 'summarize', 'CHAPTER', 'SLUG']) {
    assert.ok(main[k] !== undefined, '缺少导出 ' + k);
  }
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(SLUG, '03-shiyan-shishi');
});

test('单元即正文二级节：标题非空、字数为正、与汇总一致', () => {
  const keys = chapterKeys();
  const units = chapterUnits();
  assert.ok(units.length >= 4, '单元过少：' + units.length);
  assert.strictEqual(keys.length, units.length);
  assert.deepStrictEqual(keys, units.map((u) => u.title));
  const s = summarize(units);
  assert.strictEqual(s.units, units.length);
  assert.strictEqual(s.hanzi, units.reduce((a, u) => a + u.hanzi, 0));
  assert.strictEqual(s.hanzi, hanzi(bodyText()));
  for (const u of units) assert.ok(u.hanzi > 40, u.title + ' 太短');
});

test('正文规模达标：汉字 >=2500，章题取自一级标题', () => {
  const a = audit();
  assert.ok(a.hanzi >= 2500, '汉字 ' + a.hanzi);
  assert.ok(TITLE.length > 0, '章题未解析出来');
  assert.ok(doc.includes('# 第 ' + CHAPTER + ' 章'), '一级标题章号与代码不一致');
});

test('习题 6 题，pre 1 / check 3 / post 2', () => {
  const a = audit();
  assert.strictEqual(a.total, 6);
  assert.deepStrictEqual(a.stages, { pre: 1, check: 3, post: 2 });
});

test('每题 4 个互异选项，correct 为 0..3 整数', () => {
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.strictEqual(new Set(q.options).size, 4, '选项重复：' + q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    assert.ok(q.question.length > 6, '题干过短：' + q.question);
  }
});

test('每条解释 40–80 汉字', () => {
  for (const q of quiz.questions) {
    const n = hanzi(why(q));
    assert.ok(n >= 40 && n <= 80, n + ' 汉字：' + q.question);
  }
});

test('三道 check 题全部接地，正确选项含 >=6 汉字原文', () => {
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const q of checks) assert.ok(grounded(q.options[q.correct]), '正确选项未接地：' + q.question);
});

test('quiz 与正文不含模板残留', () => {
  const bad = [/\u4e09\u8fa8/, /\u56db\u4f4d\u9762/, /\u5355\u5143\u89c4\u6a21/,
    /\u672c\u7ae0\u5b9e\u6d4b/, /\u672c\u8bfe\u7b2c\s*\d+\s*\u7ae0[（(]/,
    /\u89c1\s*code\/main\.js\s*\u8f93\u51fa/];
  const qraw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) {
    assert.ok(!re.test(qraw), 'quiz 命中 ' + re);
    assert.ok(!re.test(doc), '正文命中 ' + re);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), '代码命中 ' + re);
  }
});

test('脚本可运行：退出 0，并打印接地数与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /接地 check 题 3\/3/);
  assert.match(r.stdout, /习题 6 题/);
  assert.match(r.stdout, /不构成/);
  assert.ok(String(r.stdout).length > 80);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
  assert.ok(DOC.endsWith(path.join('docs', 'zh.md')));
});
