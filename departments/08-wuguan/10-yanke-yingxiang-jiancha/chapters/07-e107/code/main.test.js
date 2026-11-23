'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { analyze, facts, quizAudit, sections, tables, readDoc } = require('./main.js');
const quiz = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('章规模：节标题 6 个，复查表 3 列 × 6 行', () => {
  const doc = readDoc();
  assert.strictEqual(sections(doc).length, 6);
  const ts = tables(doc);
  assert.strictEqual(ts.length, 1);
  assert.strictEqual(ts[0].cols, 3);
  assert.strictEqual(ts[0].rows.length, 6);
});

test('本章对账：三段纪律 4+3+3、建议三档、四类提前复查、基本信息 9 项', () => {
  const f = facts(readDoc());
  assert.strictEqual(f.seen.length, 4);
  assert.strictEqual(f.explain.length, 3);
  assert.strictEqual(f.advice.length, 3);
  assert.strictEqual(f.early.length, 4);
  assert.strictEqual(f.basic, 9);
  assert.strictEqual(f.selfCheck, 3);
});

test('quiz 体检：题量、三段、四选项、解释过线、check 题接地', () => {
  const a = quizAudit(quiz(), readDoc());
  assert.strictEqual(a.total, 7);
  assert.deepStrictEqual(a.stage, { pre: 1, check: 3, post: 3 });
  assert.ok(a.fourOptions);
  assert.ok(a.minExplain >= 30);
  assert.ok(a.grounded >= 2);
  assert.deepStrictEqual(a.problems, []);
});

test('analyze() 整体跑通', () => {
  const r = analyze();
  assert.ok(r.facts.lines.length >= 5);
  assert.ok(r.docHanzi > 1000);
});
