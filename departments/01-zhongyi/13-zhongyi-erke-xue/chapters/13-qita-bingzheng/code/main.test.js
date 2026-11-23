#!/usr/bin/env node
/**
 * 第 13 章 其他病证 —— 正文与习题的确定性测试
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

test('正文规模：2901 汉字 · 16 段 · 6 个二级标题', () => {
  assert.strictEqual(m.hanzi(text), 2901);
  assert.strictEqual(m.paragraphs(text).length, 16);
  assert.strictEqual(TITLE.length, 6);
});

test('二级标题与正文一致', () => {
  assert.deepStrictEqual(TITLE, [
    '一、三个刻度，三种问法',
    '二、夏季热：把「发热」这件事拆成四个可查项',
    '三、心肌炎怕漏，湿疹怕抓',
    '四、动作、记录与失效模式',
    '代价与边界',
    '检查清单',
  ]);
});

test('表格共 4 个数据行（三个刻度对照表）', () => {
  assert.strictEqual(m.tableRows(text).length, 4);
});

test('正文内书名 3 部 · 4 次，《素问·生气通天论》两见', () => {
  const c = m.citations(text);
  assert.strictEqual(c.books, 3);
  assert.strictEqual(c.total, 4);
  assert.strictEqual(c.top[0][0], '素问·生气通天论');
  assert.strictEqual(c.top[0][1], 2);
});

test('术语频次：夏季热 22 · 心肌炎 21 · 湿疹 18 · 气温 9', () => {
  const t = Object.fromEntries(m.termStats(text).map((x) => [x.term, x.count]));
  assert.strictEqual(t['夏季热'], 22);
  assert.strictEqual(t['心肌炎'], 21);
  assert.strictEqual(t['湿疹'], 18);
  assert.strictEqual(t['气温'], 9);
  assert.strictEqual(t['渗液'], 4);
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
