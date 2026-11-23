'use strict';
/**
 * 第 6 章：「28 → 27」的差、五位记录、表格条数与 quiz 结构全部钉死。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：1,939 汉字 / 6 节 / 5 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 1939);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 5);
  assert.deepStrictEqual(r.s.quotes, ['素问·脉要精微论']);
});

test('诊脉六步、四维加节律共五位', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['诊脉步数'], 6);
  assert.strictEqual(by['四维'], 4);
  assert.strictEqual(by['加节律共'], 5);
});

test('名号 28 与去重 27 差 1：缓兼平脉', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['28 名号'], 28);
  assert.strictEqual(by['去重脉名'], 27);
  assert.strictEqual(by['28 名号'] - by['去重脉名'], 1);
});

test('作废六种、脉记十列、触发五条、失效四条', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['须作废的情形'], 6);
  assert.strictEqual(by['脉记列数'], 10);
  assert.strictEqual(by['触发'], 5);
  assert.strictEqual(by['失效模式'], 4);
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
  assert.deepStrictEqual(r.quiz.answers, [1, 2, 3, 0, 1, 2]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不出现旧脚手架名目与「见输出」式解释', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});
