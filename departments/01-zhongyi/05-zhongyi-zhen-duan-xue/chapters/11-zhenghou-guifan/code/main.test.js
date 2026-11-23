'use strict';
/**
 * 第 11 章：14 = 1 + 5 + 6 + 2 的对账分布、表格条数与 quiz 结构全部钉死。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：2,019 汉字 / 6 节 / 6 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 2019);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 6);
  assert.deepStrictEqual(r.s.quotes, ['论语·子路']);
});

test('对账分布：站得住 1 / 过窄 5 / 冲突 6 / 查不到码 2，合计 14', () => {
  assert.deepStrictEqual(r.buckets, [
    { k: '对账站得住', n: 1 },
    { k: '过窄', n: 5 },
    { k: '冲突', n: 6 },
    { k: '查不到码', n: 2 },
  ]);
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['带编码病名'], 14);
  assert.strictEqual(by['四类相加'], 14);
});

test('病案十二项、命名三条件、对账表八行、作废五种、记录八列、触发四条、失效三条', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['病案项数'], 12);
  assert.strictEqual(by['命名三条件'], 3);
  assert.strictEqual(by['对账检查行'], 8);
  assert.strictEqual(by['须作废的情形'], 5);
  assert.strictEqual(by['记录列数'], 8);
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
  assert.deepStrictEqual(r.quiz.answers, [1, 3, 0, 1, 2, 3]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不出现旧脚手架名目与「见输出」式解释', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});
