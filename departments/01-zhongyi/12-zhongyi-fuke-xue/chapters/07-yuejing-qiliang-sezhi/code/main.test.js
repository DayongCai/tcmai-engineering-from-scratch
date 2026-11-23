#!/usr/bin/env node
/**
 * 第 7 章 月经病（一）：期、量、时间的三种异常 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落两处可对账的东西：
 *   1) code/main.js 从本章 docs/zh.md 现算出的结构指标（写死在此，正文改版测试先响）；
 *   2) quiz.json 与正文同源（≥5 题、三段齐、4 选项、explain ≥30 汉字、≥2 道 check 题接地、答案打散）。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { measure, TERMS, CHAPTER, PITFALLS } = require('./main.js');

const M = measure();
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const questions = Array.isArray(QUIZ.questions) ? QUIZ.questions : [];
const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const HAN = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const PINNED = {
  "hanzi": 3165,
  "h2": 6,
  "h3": 0,
  "h4": 0,
  "tables": 4,
  "tableRows": 29,
  "quotes": 20,
  "redLines": 8,
  "pitfalls": [
    "把生理当病理",
    "周期不分期",
    "以调经代替查因",
    "延误转诊"
  ],
  "terms": {
    "先期": 13,
    "后期": 11,
    "过多": 9,
    "过少": 7,
    "痛经": 12,
    "经间期出血": 8
  }
};

test('正文现算指标与实测一致', () => {
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TERMS.length, 6);
  assert.deepStrictEqual(M, PINNED);
});

test('正文规模与结构：汉字不低于 2,500、二级小节 4–8 个、表不少于 3 张', () => {
  assert.ok(M.hanzi >= 2500, `汉字 ${M.hanzi}`);
  assert.ok(M.h2 >= 4 && M.h2 <= 8, `二级小节 ${M.h2} 个`);
  assert.ok(M.tables >= 3, `表 ${M.tables} 张`);
});

test('必转红线成表：本章列出 8 条', () => {
  assert.strictEqual(M.redLines, 8);
});

test('四种失效模式都在正文里点过名', () => {
  assert.deepStrictEqual(PITFALLS, ['把生理当病理', '周期不分期', '以调经代替查因', '延误转诊']);
  assert.deepStrictEqual(M.pitfalls, PITFALLS);
});

test('六个术语都真的在正文里出现', () => {
  for (const [k, n] of Object.entries(M.terms)) assert.ok(n > 0, `${k} 出现 0 次`);
});

test('quiz 结构：≥5 题，pre/check/post 三段齐，4 选项、correct 合法、explain ≥30 汉字', () => {
  assert.ok(questions.length >= 5, `只有 ${questions.length} 题`);
  const stages = new Set(questions.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  assert.ok(questions.filter((q) => q.stage === 'check').length >= 2, 'check 段不足 2 题');
  for (const q of questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    assert.ok(HAN(q.explain) >= 30, `${q.question} explain 只有 ${HAN(q.explain)} 汉字`);
  }
});

test('quiz 接地：≥2 道 check 题正确项含正文 4 字词组，答案打散', () => {
  const body = shingles(DOC);
  const grounded = questions.filter(
    (q) => q.stage === 'check' && [...shingles(q.options[q.correct])].some((g) => body.has(g)),
  ).length;
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
  const used = new Set(questions.map((q) => q.correct));
  assert.ok(used.size >= 3, `correct 只用到 ${used.size} 个位置`);
});

test('quiz 无脚手架指纹与禁用口径', () => {
  const raw = JSON.stringify(QUIZ);
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留指纹 ${re}`);
  }
  for (const re of [/页码/, /疗程/, /发生率/, /显效率/, /剂量/]) {
    assert.ok(!re.test(raw), `禁用口径 ${re}`);
  }
});
