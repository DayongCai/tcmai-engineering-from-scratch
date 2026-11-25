'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { stats, CH, TITLE } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

test('第 5 章标题与目录一致', () => {
  assert.strictEqual(CH, 5);
  assert.ok(TITLE.length > 8, '标题过短');
});

test('正文汉字数落在 2,800–3,400（实测 3258）', () => {
  const s = stats();
  assert.ok(s.hanzi >= 2800 && s.hanzi <= 3400, '汉字数 ' + s.hanzi);
  assert.strictEqual(s.hanzi, 3258);
});

test('正文二级节数为 5', () => {
  assert.strictEqual(stats().sections, 5);
});

test('习题 6 题，pre/check/post 三段齐', () => {
  const s = stats();
  assert.strictEqual(s.questions, 6);
  assert.ok(s.stages.pre >= 1 && s.stages.check >= 2 && s.stages.post >= 1,
    JSON.stringify(s.stages));
});

test('每题 4 个选项、correct 为合法下标、解释不少于 30 汉字（最短 51）', () => {
  const questions = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  for (const q of questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    const n = (String(q.explain || '').match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(n >= 30, q.question + ' 只有 ' + n + ' 汉字');
  }
  assert.strictEqual(stats().minExplain, 51);
});

test('check 题接地：3/3 道能在正文里找到原词', () => {
  const s = stats();
  assert.ok(s.groundedChecks >= 2, '接地仅 ' + s.groundedChecks + ' 道');
  assert.strictEqual(s.groundedChecks, 3);
  assert.strictEqual(s.checks, 3);
});

test('答案位置打散：4 种、最长同位连排 1', () => {
  const s = stats();
  assert.ok(s.distinctAnswers >= 3, '只有 ' + s.distinctAnswers + ' 种位置');
  assert.ok(s.longestRun <= 2, '同位连排 ' + s.longestRun + ' 次');
  assert.deepStrictEqual(s.answers, [2, 1, 3, 0, 2, 1]);
});

test('脚本可运行，只读正文与 quiz，统计量不写死', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /正文 3258 汉字/);
  assert.match(out, /接地 check 题 3\/3/);

  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('docs') && body.includes('quiz.json'), '未指向正文与 quiz');
  assert.ok(!body.includes('3258'), '主程序不得写死汉字数');
  assert.ok(!/三辨|四位面|单元规模|本章实测|见 code\/main\.js 输出/.test(body), '含脚手架字样');
});

test('quiz 不含脚手架字样，且题面不重复', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  assert.ok(!/三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章[（(]/.test(raw));
  const qs = JSON.parse(raw).questions.map((q) => q.question);
  assert.strictEqual(new Set(qs).size, qs.length);
});

test('正文仍在 2,800–3,400 且未出现脚手架字样', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(n >= 2800 && n <= 3400, '汉字数 ' + n);
  assert.ok(!/三辨|四位面|单元规模|本章实测/.test(doc));
});
