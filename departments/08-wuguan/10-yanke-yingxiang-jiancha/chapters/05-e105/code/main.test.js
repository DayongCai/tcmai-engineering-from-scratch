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

test('本章对账：双轨、结构侧三组 × 四象限、三根柱子、四种解释、三条不互换', () => {
  const f = facts(readDoc());
  assert.strictEqual(f.tracks, 2);
  assert.strictEqual(f.groups.length, 3);
  assert.strictEqual(f.quadN, 4);
  assert.strictEqual(f.groups.length * f.quadN, 12);
  assert.deepStrictEqual(f.pillars, ['基线', '间隔', '可重复性']);
  assert.strictEqual(f.explain.length, 4);
  assert.strictEqual(f.swaps, 3);
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
