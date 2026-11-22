'use strict';
/**
 * 第 9 章的断言：十个字段数、五段齐全、缺诊断、第二层字段的原话、引文、习题。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { analyze, CHAPTER, SLUG, TITLE } = require('./main.js');

const r = analyze();

test('章号、slug、标题与 chapters.json 一致', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../chapters.json'), 'utf8'));
  const ch = reg.chapters.find((c) => c.n === CHAPTER);
  assert.ok(ch, 'chapters.json 里没有第 ' + CHAPTER + ' 章');
  assert.strictEqual(ch.slug, SLUG);
  assert.strictEqual(ch.title, TITLE);
});

test('正文的字段表十行都能由 137 案现算', () => {
  assert.ok(r.facts.length >= 10, '字段表不全（' + r.facts.length + ' 行）');
  for (const f of r.facts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('五段齐全 123 案，缺诊断 12 案，与正文对得上', () => {
  assert.strictEqual(r.five.want, 123);
  assert.strictEqual(r.five.complete, 123);
  assert.strictEqual(r.five.missingDiagnosis, 12);
  assert.ok(r.five.missingOk, '缺诊断案数 ' + r.five.missingDiagnosis + ' ≠ 正文 ' + r.five.wantMissing);
});

test('第二层字段各有原文样本可查', () => {
  for (const m of r.markers) assert.ok(m.hit, m.label + '：在 137 案里查不到足量「' + m.term + '」');
});

test('正文每一条带出处的引文都逐字落在所标单元里', () => {
  assert.ok(r.quotes.length >= 3);
  assert.deepStrictEqual(r.quoteMiss.map((q) => q.locator), [], '有引文查不到');
  for (const q of r.quotes) assert.ok(q.hanzi >= 8, q.locator + ' 的引文太短');
});

test('习题：≥5 题、三段齐、4 选项、解释≥30 汉字、接地 check ≥2', () => {
  assert.ok(r.quiz.count >= 5);
  assert.ok(r.quiz.stageOk, '缺 pre/check/post 任一段');
  assert.ok(r.quiz.optionOk);
  assert.ok(r.quiz.correctOk);
  assert.ok(r.quiz.explainOk);
  assert.ok(r.quiz.groundedCheck >= 2, '接地 check 题只有 ' + r.quiz.groundedCheck + ' 道');
  assert.ok(r.quiz.spread >= 3);
});

test('习题守住读案的五条：可检查的推理、失败段价值最高、选择偏倚、顺序是信息', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.match(raw, /一条从事实到判断的推理/);
  assert.match(raw, /分毫无效/);
  assert.match(raw, /选择偏倚/);
  assert.match(raw, /这则案不能证明什么/);
});
