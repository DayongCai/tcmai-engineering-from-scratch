'use strict';
/**
 * 第 8 章：定位五步、示例证拆项、表格条数与 quiz 结构全部钉死。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：1,879 汉字 / 6 节 / 5 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 1879);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 5);
  assert.deepStrictEqual(r.s.quotes, ['素问·咳论']);
});

test('定位五步、三个示例证，定性项最多的一组是 4 项', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['定位步数'], 5);
  assert.strictEqual(by['示例证'], 3);
  assert.strictEqual(by['示例证定性项'], 4);
  assert.deepStrictEqual(r.scored.map((x) => [x.name, x.keys]), [
    ['肝气郁结', 3],
    ['心脉痹阻', 2],
    ['脾阳虚', 1],
  ]);
});

test('门槛 2 分：每个示例证的定性项都不少于 2 项', () => {
  for (const z of r.scored) assert.ok(z.optional >= 2, `${z.name} 只有 ${z.optional} 项定性项`);
});

test('作废五种、记录九栏、触发五条、失效三条', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['须作废的情形'], 5);
  assert.strictEqual(by['记录栏位'], 9);
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
  assert.deepStrictEqual(r.quiz.answers, [1, 3, 0, 2, 1, 3]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不出现旧脚手架名目与「见输出」式解释', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});
