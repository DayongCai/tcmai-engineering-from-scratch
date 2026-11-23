#!/usr/bin/env node
/**
 * 第 6 章 肺系疾病 —— 正文与习题的确定性测试
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

test('正文规模：2987 汉字 · 20 段 · 6 个二级标题', () => {
  assert.strictEqual(m.hanzi(text), 2987);
  assert.strictEqual(m.paragraphs(text).length, 20);
  assert.strictEqual(TITLE.length, 6);
});

test('二级标题与正文一致', () => {
  assert.deepStrictEqual(TITLE, [
    '一、一条纵线：按「气被闭住的深度」排五个停靠点',
    '二、感冒：三夹是它的签名',
    '三、咳嗽到肺炎喘嗽：界线只有五个字',
    '四、哮喘与反复呼吸道感染：两把不同的尺子',
    '代价与边界',
    '检查清单',
  ]);
});

test('表格共 10 个数据行', () => {
  assert.strictEqual(m.tableRows(text).length, 10);
});

test('正文内书名 5 部 · 5 次', () => {
  const c = m.citations(text);
  assert.strictEqual(c.books, 5);
  assert.strictEqual(c.total, 5);
});

test('术语频次：肺炎喘嗽 11 · 哮喘 14 · 夙根 6 · 五字征 2', () => {
  const t = Object.fromEntries(m.termStats(text).map((x) => [x.term, x.count]));
  assert.strictEqual(t['肺炎喘嗽'], 11);
  assert.strictEqual(t['哮喘'], 14);
  assert.strictEqual(t['夙根'], 6);
  assert.strictEqual(t['五字征'], 2);
  assert.strictEqual(t['三夹'], 3);
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
