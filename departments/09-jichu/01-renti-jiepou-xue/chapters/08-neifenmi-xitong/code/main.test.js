#!/usr/bin/env node
/**
 * 人体解剖学 · 第 8 章 内分泌腺的形态差异，最后都落在「产物怎么进血」这一件事上
 * 确定性单元测试 —— 运行: node --test code/main.test.js
 *
 * 断言钉的是本机现算值：正文、算术解析或 quiz 任一处改动，这里就应当变红。
 * 数字不回读自身再自比（那样什么都测不出），而是写在断言里。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const m = require('./main.js');

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const readQuiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const grams = (t, n) => {
  const size = n || 4;
  const out = new Set();
  for (const seg of String(t || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + size <= seg.length; i += 1) out.add(seg.slice(i, i + size));
  }
  return out;
};

test('正文规模：汉字 4591 / 段 22 / 节 7', () => {
  const a = m.analyze();
  assert.strictEqual(a.total, 4591);
  assert.strictEqual(hanzi(readDoc()), 4591, '汉字口径必须与正文一致');
  assert.strictEqual(a.paragraphs, 22);
  assert.strictEqual(a.sections.length, 7);
});

test('节规模求和：4123 汉字，与全文差 468', () => {
  const a = m.analyze();
  assert.strictEqual(a.secSum, 4123);
  assert.strictEqual(a.total - a.secSum, 468);
  for (const s of a.secs) assert.ok(s.hanzi > 0, '节为空: ' + s.head);
});

test('表格：0 张，行 [] ／ 列 []', () => {
  const a = m.analyze();
  assert.deepStrictEqual(a.tables.map((t) => t.rows), []);
  assert.deepStrictEqual(a.tables.map((t) => t.cols), []);
  assert.strictEqual(a.cells, 0);
});

test('术语与枚举词：命中 10/10，枚举合计 9 次', () => {
  const a = m.analyze();
  assert.strictEqual(a.hitTerms, 10);
  assert.strictEqual(a.enumSum, 9);
  for (const [t, n] of a.termHits) assert.ok(n > 0, '正文里没有这个术语: ' + t);
});

test('quiz 结构：7 题、三段齐、4 选项、下标合法、答案打散', () => {
  const quiz = readQuiz();
  assert.strictEqual(quiz.questions.length, 7);
  assert.deepStrictEqual(quiz.questions.map((x) => x.correct), [1,2,0,2,1,0,1]);
  const distinct = [...new Set(quiz.questions.map((x) => x.correct))].sort((x, y) => x - y);
  assert.ok(distinct.length >= 3, '答案位置只有 ' + distinct.length + ' 种');
  const stages = new Set(quiz.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  for (const x of quiz.questions) {
    assert.strictEqual(x.options.length, 4, x.question);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4, 'correct 越界: ' + x.question);
    assert.ok(typeof x.explain === 'string' && x.explain.length > 0, '缺 explain: ' + x.question);
  }
});

test('quiz 接地：3 道 check 题的正确选项含正文原词', () => {
  const body = grams(readDoc(), 4);
  const quiz = readQuiz();
  const grounded = quiz.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const right = String(x.options[x.correct] || '');
    return [...grams(right, 4)].some((g) => body.has(g));
  });
  assert.ok(grounded.length >= 2, '只接地 ' + grounded.length + ' 道');
  assert.strictEqual(m.analyze().quiz.checkGrounded, grounded.length, '与正文口径必须一致');
});

test('quiz 解释：每题 ≥30 汉字，最短 90 汉字', () => {
  const quiz = readQuiz();
  const lens = quiz.questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 30), [], '有解释不足 30 汉字');
  assert.strictEqual(Math.min.apply(null, lens), 90);
  assert.strictEqual(m.analyze().quiz.minExplain, 90);
});

test('脚本可运行：退出码 0，输出带现算与边界声明', () => {
  const out = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(out.status, 0, String(out.stderr));
  const text = String(out.stdout || '');
  assert.ok(text.length > 200, '输出过短');
  assert.match(text, /现算/);
  assert.match(text, /不构成诊疗建议/);
  assert.match(text, /第 8 章/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/08-neifenmi-xitong/docs/zh.md'), '头部注释未指向本章');
});
