'use strict';
/**
 * 第 3 章：27 个特征词的逐组分解与合计、表格条数、quiz 结构，全部钉死。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：2,212 汉字 / 6 节 / 6 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 2212);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 6);
  assert.deepStrictEqual(r.s.quotes, ['灵枢·五阅五使']);
});

test('五组取值逐组相加为 27，与表内合计行一致', () => {
  assert.deepStrictEqual(r.words.map((w) => [w.group, w.n]), [
    ['舌色', 5],
    ['舌形', 6],
    ['舌态', 5],
    ['苔质', 7],
    ['苔色', 4],
  ]);
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['特征词合计'], 27);
  assert.strictEqual(by['表内合计行'], 27);
});

test('两组单选（舌色、苔色）、三组多选；苔质是 7 项不是 6 项', () => {
  assert.deepStrictEqual(r.words.filter((w) => w.mode.includes('单选')).map((w) => w.group), ['舌色', '苔色']);
  assert.strictEqual(r.words.filter((w) => w.mode.includes('多选')).length, 3);
  assert.strictEqual(r.words.find((w) => w.group === '苔质').n, 7);
});

test('采集五步、作废四种、记录十一列、触发五条、失效三条', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['采集步数'], 5);
  assert.strictEqual(by['须作废的情形'], 4);
  assert.strictEqual(by['记录列数'], 11);
  assert.strictEqual(by['触发'], 5);
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
  assert.deepStrictEqual(r.quiz.answers, [0, 3, 0, 2, 1, 3]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不出现旧脚手架名目与「见输出」式解释', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});
