#!/usr/bin/env node
/**
 * 第 11 章 虫证 —— 正文与习题的确定性测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const m = require('./main.js');

const text = m.read();
const TITLE = m.headings(text);

test('正文规模：2891 汉字 · 17 段 · 6 个二级标题', () => {
  assert.strictEqual(m.hanzi(text), 2891);
  assert.strictEqual(m.paragraphs(text).length, 17);
  assert.strictEqual(TITLE.length, 6);
});

test('二级标题与正文一致', () => {
  assert.deepStrictEqual(TITLE, [
    '一、一张位置表：虫在哪里，决定它是什么病',
    '二、蛔虫：三型，后两型不属内科',
    '三、蛲虫：一个夜间动作就能确诊',
    '四、动作、记录与失效模式',
    '代价与边界',
    '检查清单',
  ]);
});

test('表格共 5 个数据行（虫的位置表）', () => {
  assert.strictEqual(m.tableRows(text).length, 5);
});

test('正文内书名 4 部 · 5 次，《灵枢·厥病》两见', () => {
  const c = m.citations(text);
  assert.strictEqual(c.books, 4);
  assert.strictEqual(c.total, 5);
  assert.strictEqual(c.top[0][0], '灵枢·厥病');
  assert.strictEqual(c.top[0][1], 2);
});

test('术语频次：驱虫 20 · 虫瘕 12 · 蛔厥 10 · 蛲虫 10', () => {
  const t = Object.fromEntries(m.termStats(text).map((x) => [x.term, x.count]));
  assert.strictEqual(t['驱虫'], 20);
  assert.strictEqual(t['虫瘕'], 12);
  assert.strictEqual(t['蛔厥'], 10);
  assert.strictEqual(t['蛲虫'], 10);
  assert.strictEqual(t['安蛔'], 3);
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
