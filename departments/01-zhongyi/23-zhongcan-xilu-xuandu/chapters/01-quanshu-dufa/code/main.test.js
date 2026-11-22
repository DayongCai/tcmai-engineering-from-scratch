'use strict';
/**
 * 第 1 章的断言：正文表、引文、习题三头对读，全部从 units.json 与 docs/zh.md 现算。
 * 原文数据一换、正文改一个数、引文错一个字、quiz 跑题，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { analyze, CHAPTER, SLUG, TITLE } = require('./main.js');

const r = analyze();

test('章号、slug、标题与 chapters.json 一致', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../chapters.json'), 'utf8'));
  const ch = reg.chapters.find((c) => c.n === CHAPTER);
  assert.ok(ch, 'chapters.json 里没有第 ' + CHAPTER + ' 章');
  assert.strictEqual(ch.slug, SLUG);
  assert.strictEqual(ch.title, TITLE);
});

test('正文五类表里的每一个数都能由 units.json 现算', () => {
  const table = r.facts.filter((f) => /^[一二三四五]、/.test(f.label) || f.label === '单元总数');
  assert.ok(table.length >= 6, '正文里没有五类表');
  for (const f of table) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
  const sum = Object.values(r.segments).reduce((a, n) => a + n, 0);
  assert.strictEqual(sum, r.total, '五类之和与单元总数不相等');
});

test('正文说「阿斯匹林一百多处」，原文现算得到同一个数', () => {
  const f = r.facts.find((x) => x.label === '阿司匹林出现处数');
  assert.ok(f, '正文没有写阿司匹林的出现处数');
  assert.strictEqual(f.want, 145);
  assert.strictEqual(f.got, f.want, '原文计数与正文不一致');
});

test('正文说本仓没有自序，原文里确实查不到自序', () => {
  const f = r.facts.find((x) => x.label === '自序篇数');
  assert.strictEqual(f.want, 0);
  assert.strictEqual(f.got, 0);
});

test('正文每一条带出处的引文都逐字落在所标的单元里', () => {
  assert.ok(r.quotes.length >= 3, '正文引文太少，不足以支撑「正文用法反推」的论证');
  assert.deepStrictEqual(r.quoteMiss.map((q) => q.locator), [], '有引文查不到');
  for (const q of r.quotes) {
    assert.ok(q.unit, q.locator + ' 在 units.json 里没有对应单元');
    assert.ok(q.hanzi >= 8, q.locator + ' 的引文只有 ' + q.hanzi + ' 字，太短不足以核');
  }
});

test('习题：≥5 题、三段齐、4 选项、解释≥30 汉字', () => {
  assert.ok(r.quiz.count >= 5, '只有 ' + r.quiz.count + ' 题');
  assert.ok(r.quiz.stageOk, '缺 pre/check/post 任一段');
  assert.ok(r.quiz.optionOk, '有题不是 4 选项');
  assert.ok(r.quiz.correctOk, 'correct 下标越界');
  assert.ok(r.quiz.explainOk, '有题 explain 不足 30 汉字');
});

test('习题：≥2 道 check 的正确项能在正文找到原词，答案不集中', () => {
  assert.ok(r.quiz.groundedCheck >= 2, '接地 check 题只有 ' + r.quiz.groundedCheck + ' 道');
  assert.ok(r.quiz.spread >= 3, '正确项只落在 ' + r.quiz.spread + ' 个位置');
});

test('习题问的是本章的读法：书名是排序、三层参西、四层对读', () => {
  const text = JSON.stringify(r.quiz.items.map((x) => x.right)) + JSON.stringify(r.quiz.items);
  assert.match(text, /坐标|先立中法|排序|次序/);
  assert.match(text, /借解释/);
  assert.match(text, /四层|方下/);
});
