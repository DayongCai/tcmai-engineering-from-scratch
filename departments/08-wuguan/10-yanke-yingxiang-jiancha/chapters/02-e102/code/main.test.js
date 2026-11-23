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

test('本章对账：三层壁、屈光间质、象限、两套血管、五轮对应', () => {
  const f = facts(readDoc());
  assert.deepStrictEqual(f.walls, ['纤维膜', '血管膜', '视网膜']);
  assert.strictEqual(f.cornea, 5);
  assert.strictEqual(f.media.length, 4);
  assert.strictEqual(f.quadN, 4);
  assert.deepStrictEqual(f.quads, ['上颞', '下颞', '上鼻', '下鼻']);
  assert.strictEqual(f.vessels.length, 2);
  assert.strictEqual(f.wheelN, 4);
  assert.strictEqual(f.chiasm, 2);
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
