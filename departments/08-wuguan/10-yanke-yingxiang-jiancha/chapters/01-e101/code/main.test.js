'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { analyze, facts, quizAudit, sections, tables, readDoc } = require('./main.js');
const quiz = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('章规模：节标题 6 个，正文非空', () => {
  const doc = readDoc();
  assert.strictEqual(sections(doc).length, 6);
  assert.ok(doc.length > 1000);
  assert.strictEqual(tables(doc).length, 0);
});

test('本章对账：四区五轮配属与闸门问数由正文解析', () => {
  const f = facts(readDoc());
  assert.strictEqual(f.pairs.length, 4);
  assert.deepStrictEqual(f.pairs[0], '胞睑·肉轮·脾');
  assert.strictEqual(f.blind, 3);
  assert.strictEqual(f.directions, 2);
  assert.strictEqual(f.can, 5);
  assert.strictEqual(f.cannot, 6);
  assert.strictEqual(f.gates.length, 3);
  assert.strictEqual(f.fourth, '谁在场、东西在哪');
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

test('analyze() 整体跑通，对账行不成空', () => {
  const r = analyze();
  assert.ok(r.facts.lines.length >= 5);
  assert.ok(r.docHanzi > 1000);
  assert.ok(r.quiz.total > 0);
});
