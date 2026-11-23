'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { analyze, facts, quizAudit, sections, tables, readDoc } = require('./main.js');
const quiz = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('章规模：节标题 6 个，无表格', () => {
  const doc = readDoc();
  assert.strictEqual(sections(doc).length, 6);
  assert.strictEqual(tables(doc).length, 0);
});

test('本章对账：三条来路、四类字段、三条采集规则、必删 8 / 可留 6、五权', () => {
  const f = facts(readDoc());
  assert.strictEqual(f.routes, 3);
  assert.strictEqual(f.fields.length, 4);
  assert.strictEqual(f.rules, 3);
  assert.strictEqual(f.mustDelete.length, 8);
  assert.strictEqual(f.mayKeep.length, 6);
  assert.strictEqual(f.redlines, 3);
  assert.strictEqual(f.asks, 3);
  assert.strictEqual(f.rights, 5);
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
