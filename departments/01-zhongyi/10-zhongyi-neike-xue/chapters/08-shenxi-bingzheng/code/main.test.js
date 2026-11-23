#!/usr/bin/env node
/**
 * 第 8 章 肾系病证：六病落在水、溺、精三条通道上，溺道三病是一条进展线而非三个并列病 —— 确定性单元测试
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

const { measure, TERMS, CHAPTER } = require('./main.js');

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
  "hanzi": 9152,
  "h2": 6,
  "h3": 37,
  "h4": 0,
  "tables": 4,
  "tableRows": 24,
  "quotes": 44,
  "locators": 13,
  "subNos": 30,
  "terms": {
    "水肿": 42,
    "淋证": 35,
    "癃闭": 35,
    "阳痿": 14,
    "水": 153,
    "精": 60
  }
};

test('正文现算指标与实测一致', () => {
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TERMS.length, 6);
  assert.deepStrictEqual(M, PINNED);
});

test('二级小节收口在 4–8 个，正文汉字不低于 2,500，三级出处不少于 10 条', () => {
  assert.ok(M.h2 >= 4 && M.h2 <= 8, `二级小节 ${M.h2} 个`);
  assert.ok(M.hanzi >= 2500, `汉字 ${M.hanzi}`);
  assert.ok(M.locators >= 10, `三级出处 ${M.locators} 条`);
});

test('术语表六个词都真的在正文里出现', () => {
  for (const [k, n] of Object.entries(M.terms)) assert.ok(n > 0, `${k} 出现 0 次`);
});

test('quiz 结构：≥5 题，pre/check/post 三段齐，4 选项、correct 合法、explain ≥30 汉字', () => {
  assert.ok(questions.length >= 5, `只有 ${questions.length} 题`);
  const stages = new Set(questions.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
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
  for (const re of [/页码/, /疗程/, /发生率/, /显效率/, /每日\s*\d+\s*(?:次|服)/]) {
    assert.ok(!re.test(raw), `禁用口径 ${re}`);
  }
});
