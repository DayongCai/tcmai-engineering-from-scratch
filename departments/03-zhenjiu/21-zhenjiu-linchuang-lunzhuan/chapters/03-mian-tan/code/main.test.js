#!/usr/bin/env node
/**
 * 第 3 章 面瘫与周围神经损伤轮转 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const STD = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'standards', 'zhenjiu-lunzhuan2');
const { chapterKeys, chapterUnits, summarize, selfCheck, grounded, shingles, CHAPTER, SLUG } = require('./main.js');

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r/g, '');
const readQuiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('章映射与教材单元层一致', () => {
  const map = JSON.parse(fs.readFileSync(path.join(STD, 'chapter-map.json'), 'utf8')).chapters;
  assert.deepStrictEqual(chapterKeys(), map[SLUG].units);
  assert.strictEqual(String(map[SLUG].n), String(CHAPTER));
});

test('本章单元与汉字数可从单元层复算', () => {
  const units = chapterUnits();
  assert.strictEqual(units.length, chapterKeys().length);
  assert.strictEqual(summarize(units).hanzi, units.reduce((a, b) => a + b.hanzi, 0));
  assert.ok(summarize(units).hanzi > 1000, '汉字过少');
});

test('正文写明的单元数与总字数与单元层现算一致', () => {
  const units = chapterUnits();
  const total = summarize(units).hanzi;
  const doc = readDoc();
  assert.ok(doc.includes(`本章 ${units.length} 单元`), '正文未写单元数，或与现算不符');
  assert.ok(doc.includes(total.toLocaleString('en-US')), `正文未写总字数 ${total}`);
});

test('习题结构：6 题，pre 1 / check 3 / post 2，每题 4 选项', () => {
  const qs = readQuiz().questions;
  assert.strictEqual(qs.length, 6);
  const got = { pre: 0, check: 0, post: 0 };
  for (const q of qs) {
    assert.ok(q.stage in got, `stage 非法: ${q.stage}`);
    got[q.stage] += 1;
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
  }
  assert.deepStrictEqual(got, { pre: 1, check: 3, post: 2 });
});

test('每题解释 40–80 汉字，不含脚手架话术', () => {
  for (const q of readQuiz().questions) {
    const n = hz(q.explain || q.explanation);
    assert.ok(n >= 40 && n <= 80, `解释 ${n} 汉字，越界: ${q.question}`);
    assert.doesNotMatch(q.explain, /见\s*code\/main\.js\s*输出/);
  }
});

test('check 题的正确选项都能在正文里找到 6 字以上连续原词', () => {
  const body = shingles(readDoc(), 6);
  const checks = readQuiz().questions.filter((q) => q.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const q of checks) {
    const hit = grounded(q.options[q.correct], body, 6);
    assert.ok(hit, `未接地: ${q.question}`);
  }
  assert.strictEqual(selfCheck(readDoc(), readQuiz()).hit, 3);
});

test('自检输出前三行与正文「运行与验证」节录逐字一致', () => {
  const doc = readDoc();
  const block = doc.match(/```text\n([\s\S]*?)```/)[1]
    .trim().split('\n').map((l) => l.trim());
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const head = String(r.stdout || '').replace(/\r/g, '').split('\n').slice(0, 3).map((l) => l.trim());
  assert.deepStrictEqual(head, block);
});

test('自检通过，且输出含教学样例与边界声明', () => {
  const s = selfCheck(readDoc(), readQuiz());
  assert.ok(s.ok, '自检判据未通过');
  assert.ok(s.hanzi >= 2500 && s.secs >= 4);
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  const out = String(r.stdout || '');
  assert.match(out, /教学样例：统计行由 standards\/zhenjiu-lunzhuan2\/units\.json 现算/);
  assert.match(out, /不构成临床判断依据/);
});
