'use strict';
/**
 * 第 5 章的断言：四味药的条目数、覆盖面排序、剂型与药材质量的原话、引文、习题。
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

test('正文四个药名条目数与原文现算逐个相等', () => {
  const herbFacts = r.facts.filter((f) => f.key);
  assert.strictEqual(herbFacts.length, 4);
  for (const f of herbFacts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('山药的覆盖面确实排在这四味之首', () => {
  assert.ok(r.ranking.topIsShanyao, '首位是 ' + r.ranking.top + '，与正文「覆盖面超过任何一味补气药或清热药」不符');
  const rows = r.ranking.rows;
  assert.ok(rows[0][1] > rows[1][1], '首位与次位并列，排序无意义');
});

test('剂型与药材质量各有一条原话可查', () => {
  for (const m of r.markers) assert.ok(m.hit, m.label + '：在《' + m.where + '》里查不到「' + m.term + '」');
});

test('正文每一条带出处的引文都逐字落在所标单元里', () => {
  assert.ok(r.quotes.length >= 4);
  assert.deepStrictEqual(r.quoteMiss.map((q) => q.locator), [], '有引文查不到');
  for (const q of r.quotes) assert.ok(q.hanzi >= 8, q.locator + ' 的引文太短');
});

test('习题：≥5 题、三段齐、4 选项、解释≥30 汉字、接地 check ≥2', () => {
  assert.ok(r.quiz.count >= 5);
  assert.ok(r.quiz.stageOk, '缺 pre/check/post 任一段');
  assert.ok(r.quiz.optionOk);
  assert.ok(r.quiz.correctOk);
  assert.ok(r.quiz.explainOk);
  assert.ok(r.quiz.groundedCheck >= 2, '接地 check 题只有 ' + r.quiz.groundedCheck + ' 道');
  assert.ok(r.quiz.spread >= 3);
});

test('习题守住时间差：久服与急煎不可互换', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.match(raw, /爆火煎一沸/);
  assert.match(raw, /不可炒用/);
  assert.match(raw, /一个填一个守|补而不收则散/);
});
