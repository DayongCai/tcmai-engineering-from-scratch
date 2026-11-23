'use strict';
/**
 * 第 1 章：正文结构量、表格条数与 quiz 结构全部钉死。
 * 正文或 quiz 一改，这里逐条报出是哪一项对不上。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze } = require('./main.js');

const r = analyze();

test('正文骨架：2,008 汉字 / 6 节 / 4 表 / 1 条篇名级引文', () => {
  assert.strictEqual(r.s.hanzi, 2008);
  assert.strictEqual(r.s.sections.length, 6);
  assert.strictEqual(r.s.tableCount, 4);
  assert.strictEqual(r.s.quotes.length, 1);
  assert.ok(r.s.quotes.includes('难经·六十一难'));
});

test('生成块不计入：UNITNOTES 之后的内容一个字都不算', () => {
  assert.ok(!r.s.body.includes('UNITNOTES'));
  assert.ok(!r.s.body.includes('教材小节：逐条落位'));
  assert.ok(r.s.body.includes('## 五、代价与边界'));
});

test('表格条数与正文所写一致：四步 / 六种作废情形 / 十二列 / 六条触发', () => {
  const by = Object.fromEntries(r.facts.map((f) => [f.label, f.got]));
  assert.strictEqual(by['采集步数'], 4);
  assert.strictEqual(by['须作废的情形'], 6);
  assert.strictEqual(by['记录列数'], 12);
  assert.strictEqual(by['转诊触发'], 6);
  assert.strictEqual(by['成组三条'], 3);
  assert.strictEqual(by['考核项'], 6);
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

test('quiz 接地与打散：check 题三道都能在正文找到原词，答案落在 4 个不同位置', () => {
  assert.strictEqual(r.quiz.checkGrounded, 3);
  assert.deepStrictEqual(r.quiz.answers, [1, 3, 2, 0, 2, 3]);
  assert.strictEqual(r.quiz.distinctAnswers, 4);
});

test('quiz 不出现旧脚手架名目与「见输出」式解释', () => {
  const raw = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.json'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
});
