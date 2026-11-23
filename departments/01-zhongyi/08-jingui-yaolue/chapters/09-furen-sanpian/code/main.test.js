'use strict';
/**
 * 第 9 章的习题与正文对齐：正文规模、本文算式、表里的方/条、quiz 结构与接地，
 * 全部从本章 docs/zh.md 现算后断言。正文改一个字、表里改一个数、quiz 跑题，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const { analyze, QUIZ } = require('./main.js');

const r = analyze();

test('正文规模钉死：汉字 / 节 / 表 / 行 / 引文', () => {
  assert.strictEqual(r.stats.hanzi, 6743);
  assert.strictEqual(r.stats.bodyHanzi, 3651);
  assert.strictEqual(r.stats.sections, 6);
  assert.strictEqual(r.stats.subsections, 9);
  assert.strictEqual(r.stats.tables, 7);
  assert.strictEqual(r.stats.tableRows, 33);
  assert.strictEqual(r.stats.quoteLines, 10);
});

test('正文写下的每条算式都成立（共 8 条）', () => {
  assert.strictEqual(r.claims.length, 8);
  for (const c of r.claims) assert.ok(c.ok, `${c.label}: 现算 ${c.got} ≠ 正文 ${c.want}`);
});

test('正文的除法与百分比自洽', () => {
  for (const d of r.divisions) assert.ok(Math.abs(d.got - d.want) <= d.tol, `${d.text} 现算 ${d.got}`);
  for (const p of r.percents) assert.ok(Math.abs(p.got - p.want) <= p.tol, `${p.text} 现算 ${p.got}%`);
});

test('表里写明的方/条逐行重算（4 行）', () => {
  assert.strictEqual(r.ratios.length, 4);
  for (const x of r.ratios) assert.ok(x.ok, `${x.row}: ${x.fang} ÷ ${x.tiao} = ${x.got}，表写 ${x.stated}`);
});

test('附全录条数与正文声明一致', () => {
  assert.strictEqual(r.stats.attach.stated, 44);
  assert.strictEqual(r.stats.attach.counted, 44);
});

test('quiz 结构：题量、三段、四选项、解释长度、答案下标', () => {
  const q = r.quiz;
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const st of ['pre', 'check', 'post']) assert.ok(q.stage[st] >= 1, `缺 ${st} 段`);
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法（须为 0–3）');
  assert.ok(q.minExplain >= 30, `最短的解释只有 ${q.minExplain} 汉字`);
  assert.ok(q.distinctAnswers >= 3, `答案只用到 ${q.distinctAnswers} 个位置`);
});

test('quiz 接地：check 题的正确选项能在本章正文找到 4 字原词', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
});

test('quiz 干净：无脚手架字样、无剂量/疗程/发生率/页码', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出', '剂量', '疗程', '发生率', '页码']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
  assert.ok(!/本课第\s*\d+\s*章[（(]/.test(raw), 'quiz 仍含「本课第 N 章（」');
  for (const q of JSON.parse(raw).questions) {
    assert.ok(q.question && q.question.length >= 8, '题干过短');
    assert.strictEqual(q.options.length, 4);
  }
});
