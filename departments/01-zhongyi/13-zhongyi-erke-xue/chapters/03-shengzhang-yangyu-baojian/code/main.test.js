#!/usr/bin/env node
/**
 * 第 3 章 生长发育与喂养保健 —— 正文与习题的确定性测试
 * 运行: node --test code/main.test.js
 *
 * 断言分两层：正文现算值；quiz 结构（题量、三段、选项、解释长度、check 题接地）。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const m = require('./main.js');

const text = m.read();
const TITLE = m.headings(text);

test('正文规模：2981 汉字 · 17 段 · 6 个二级标题', () => {
  assert.strictEqual(m.hanzi(text), 2981);
  assert.strictEqual(m.paragraphs(text).length, 17);
  assert.strictEqual(TITLE.length, 6);
});

test('二级标题与正文一致', () => {
  assert.deepStrictEqual(TITLE, [
    '一、四个指标，三条读法',
    '二、骨性标志与里程碑：把「发育慢」变成时点比较',
    '三、喂养：三段式与五条顺序约束',
    '四、护理、记录与失效模式',
    '代价与边界',
    '检查清单',
  ]);
});

test('表格共 15 个数据行', () => {
  assert.strictEqual(m.tableRows(text).length, 15);
});

test('正文内书名 2 部 · 2 次（本章不靠经典说话）', () => {
  const c = m.citations(text);
  assert.strictEqual(c.books, 2);
  assert.strictEqual(c.total, 2);
});

test('术语频次：生长曲线 1 · 前囟 4 · 乳牙 3 · 辅食 4 · 接种 10', () => {
  const t = Object.fromEntries(m.termStats(text).map((x) => [x.term, x.count]));
  assert.strictEqual(t['生长曲线'], 1);
  assert.strictEqual(t['前囟'], 4);
  assert.strictEqual(t['乳牙'], 3);
  assert.strictEqual(t['辅食'], 4);
  assert.strictEqual(t['接种'], 10);
  assert.strictEqual(t['食复'], 2);
});

test('检查清单 8 条，两条护栏均为 0', () => {
  assert.strictEqual(m.checklistCount(text), 8);
  assert.strictEqual(m.doseGuard(text), 0, '正文不得出现具体给药量');
  assert.strictEqual(m.pageRefs(text), 0, '正文不得引页码');
});

const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('quiz：≥5 题，pre / check / post 三段齐', () => {
  assert.ok(quiz.questions.length >= 5, `只有 ${quiz.questions.length} 题`);
  const stages = new Set(quiz.questions.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
});

test('quiz：每题 4 选项、correct 合法、explain ≥30 汉字', () => {
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    const n = (String(q.explanation).match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(n >= 30, `${q.question} 解释仅 ${n} 汉字`);
  }
});

test('quiz：check 题正确选项与正文同词（≥2 道），答案不集中于一项', () => {
  const clean = text.replace(/[^\u4e00-\u9fff]/g, ' ');
  const grams = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) grams.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of quiz.questions.filter((x) => x.stage === 'check')) {
    const right = q.options[q.correct];
    const hit = [...right.replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)]
      .some((seg) => seg.length >= 4 && [...Array(seg.length - 3)].some((_, i) => grams.has(seg.slice(i, i + 4))));
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题能接地`);
  const answers = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(answers.size >= 3, '答案过度集中');
});
