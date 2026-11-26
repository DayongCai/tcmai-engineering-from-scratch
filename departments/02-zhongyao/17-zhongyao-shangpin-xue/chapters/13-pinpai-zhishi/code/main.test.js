#!/usr/bin/env node
/**
 * 第 13 章 品牌护住的是来源的名声，护不住这一批药的质量 —— 正文与习题自检的确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  CHAPTER, SLUG, DOC, QUIZ, doc, quiz, hz, chapterUnits, citations, shape, hands, grounded, why, audit,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文规模锁定：4980 汉字、7 个二级节', () => {
  const a = audit();
  assert.strictEqual(a.hanzi, 4980, '正文字数漂移');
  assert.strictEqual(a.secs, 7, '二级节数漂移');
  assert.strictEqual(a.hanzi, hz(doc));
});

test('习题 6 题，pre 1 / check 3 / post 2', () => {
  const a = audit();
  assert.strictEqual(a.total, 6);
  assert.deepStrictEqual(a.stages, { pre: 1, check: 3, post: 2 });
});

test('每题 4 个互异选项，correct 为 0..3 的整数', () => {
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.strictEqual(new Set(q.options).size, 4, '选项重复：' + q.question);
    for (const o of q.options) assert.ok(String(o).trim().length > 0, '空选项：' + q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    assert.ok(q.question && q.question.length > 6, '题干过短');
  }
});

test('每条解释 40–80 汉字', () => {
  for (const q of quiz.questions) {
    const n = hz(why(q));
    assert.ok(n >= 40 && n <= 80, n + ' 汉字：' + q.question);
  }
});

test('三道 check 题全部接地：正确选项含 >=6 汉字原文', () => {
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const q of checks) assert.ok(grounded(q.options[q.correct]), '未接地：' + q.question);
  assert.strictEqual(audit().hit, 3);
});

test('quiz 与 main.js 不含模板残留', () => {
  // 判据写成码位，测试文件本身不带出旧词
  const bad = [
    /\u4e09\u8fa8/, /\u56db\u4f4d\u9762/, /\u5355\u5143\u89c4\u6a21/,
    /\u672c\u7ae0\u5b9e\u6d4b/, /\u672c\u8bfe\u7b2c\s*\d+\s*\u7ae0[（(]/,
    /\u89c1\s*code\/main\.js\s*\u8f93\u51fa/];
  const qraw = fs.readFileSync(QUIZ, 'utf8');
  const mraw = fs.readFileSync(MAIN, 'utf8');
  for (const re of bad) {
    assert.ok(!re.test(qraw), 'quiz 命中 ' + re);
    assert.ok(!re.test(mraw), 'main.js 命中 ' + re);
  }
});

test('本章统计可复算：引书数、操作词与节数互相自洽', () => {
  const list = chapterUnits();
  const s = shape(list);
  assert.strictEqual(s.units, list.length);
  assert.strictEqual(s.hanzi, 4980, '正文汉字应能整章复原');
  const c = citations(list);
  assert.ok(c.total >= c.books, '引书计数不成立');
  if (/《[^》]{2,40}》/.test(doc)) assert.ok(c.books >= 1, '正文有书名号却未统计到引书');
  const h = hands(list);
  assert.ok(h.length >= 2, '操作词命中少于 2 项：' + JSON.stringify(h));
  for (const [, n] of h) assert.ok(n > 0);
});

test('脚本可运行：退出码 0，输出含接地数与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /接地 check 题 3\/3/);
  assert.match(r.stdout, /习题 6 题/);
  assert.match(r.stdout, /不构成/);
});

test('章节标识与目录一致，头部注释指向本章正文', () => {
  assert.strictEqual(SLUG, path.basename(path.resolve(__dirname, '..')));
  assert.strictEqual(String(CHAPTER), String(Number(SLUG.slice(0, 2))));
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
});
