'use strict';
/**
 * 第 4 章：855 = 684 + 171 的加总、采集九项、判据组与 quiz 结构全部钉死。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：2,087 汉字 / 6 节 / 5 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 2087);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 5);
  assert.deepStrictEqual(r.s.quotes, ['素问·阴阳应象大论']);
});

test('听 684 + 嗅 171 = 855，与正文所写的总字数自洽', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['闻诊总字数'], 855);
  assert.strictEqual(by['听的一半'], 684);
  assert.strictEqual(by['嗅的一半'], 171);
  assert.strictEqual(by['两半相加'], 855);
});

test('采集九项、判据组五组、作废五种、记录十列、触发五条、失效四条', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['采集项'], 9);
  assert.strictEqual(by['判据组'], 5);
  assert.strictEqual(by['须作废的情形'], 5);
  assert.strictEqual(by['记录列数'], 10);
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
  assert.deepStrictEqual(r.quiz.answers, [1, 2, 0, 3, 1, 2]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不出现旧脚手架名目与「见输出」式解释', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});
