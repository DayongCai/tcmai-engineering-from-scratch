'use strict';
/**
 * 第 2 章：正文结构量、表格条数与 quiz 结构全部钉死。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：2,060 汉字 / 6 节 / 5 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 2060);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 5);
  assert.deepStrictEqual(r.s.quotes, ['灵枢·本脏']);
});

test('生成块不计入：教材小节落位与 UNITNOTES 都不进统计', () => {
  assert.ok(!r.s.body.includes('UNITNOTES'));
  assert.ok(!r.s.body.includes('教材小节：逐条落位'));
  assert.ok(r.s.body.includes('## 四、动作与边界'));
});

test('采集路线 14 个部位、得神 4 项、判据组 5 组、作废 5 种、记录 12 列', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['路线部位数'], 14);
  assert.strictEqual(by['得神判据项'], 4);
  assert.strictEqual(by['判据组'], 5);
  assert.strictEqual(by['须作废的情形'], 5);
  assert.strictEqual(by['记录列数'], 12);
  assert.strictEqual(by['转诊触发'], 7);
  assert.strictEqual(by['失效模式'], 5);
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
  assert.deepStrictEqual(r.quiz.answers, [2, 3, 1, 0, 2, 0]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不出现旧脚手架名目与「见输出」式解释', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});
