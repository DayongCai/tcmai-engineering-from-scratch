'use strict';
/**
 * 第 12 章：四条来源、八项检查表、正文 0 个百分号，以及 quiz 结构全部钉死。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：1,883 汉字 / 6 节 / 5 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 1883);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 5);
  assert.deepStrictEqual(r.s.quotes, ['素问·征四失论']);
});

test('四条来源、可指认三条、判据四组、检查表八项', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['误差来源'], 4);
  assert.strictEqual(by['可指认三条'], 3);
  assert.strictEqual(by['判据组'], 4);
  assert.strictEqual(by['检查表项'], 8);
});

test('正文里百分号 0 处——本章的论点就建立在这个数上', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['正文百分号'], 0);
});

test('作废四种、触发四条、失效三条', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['须作废的情形'], 4);
  assert.strictEqual(by['触发'], 4);
  assert.strictEqual(by['失效模式'], 3);
});

test('本章写下的数与现算逐条相等', () => {
  for (const f of r.facts) assert.strictEqual(f.got, f.want, `${f.label}: 现算 ${f.got} ≠ 正文 ${f.want}`);
});

test('quiz 结构：6 题，pre 1 / check 3 / post 2，四选项，解释不少于 30 汉字', () => {
  const q = r.quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, { pre: 1, check: 3, post: 2 });
  assert.strictEqual(q.allFourOptions, true);
  assert.ok(q.minExplain >= 30, `最短解释 ${q.minExplain} 汉字`);
});

test('quiz 接地与打散：check 题三道全部接地，答案用满 4 个位置', () => {
  assert.strictEqual(r.quiz.checkGrounded, 3);
  assert.deepStrictEqual(r.quiz.answers, [2, 1, 3, 1, 3, 0]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不给任何发生率或百分比，并避开旧脚手架名目', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
  const quiz = JSON.parse(raw);
  for (const q of quiz.questions) assert.ok(!/%/.test(q.explain), `解释里出现了百分号：${q.question}`);
});
