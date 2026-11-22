'use strict';
/**
 * 第 10 章的断言：词频表十一个数、器械读数的落点、五层的原话、引文、习题。
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

test('正文词频表的十一个数全部现算相等', () => {
  assert.ok(r.freq.length >= 10, '词频表只有 ' + r.freq.length + ' 项');
  for (const f of r.freq) assert.ok(f.ok, '「' + f.term + '」现算 ' + f.got + ' ≠ 正文 ' + f.want);
});

test('血压与汞柱的落点与现算一致', () => {
  assert.ok(r.scene.mercuryInCase, '汞柱 2 处不在王姓叟一案所在的单元里：' + r.scene.mercury.join('、'));
  assert.ok(r.scene.pressureOnce, '血压并非只落在 1 个单元：' + r.scene.pressure.join('、'));
});

test('五层的每一层都有原话可查', () => {
  for (const m of r.markers) assert.ok(m.hit, m.label + '：在《' + m.where + '》里查不到「' + m.term + '」');
});

test('正文每一条带出处的引文都逐字落在所标单元里', () => {
  assert.ok(r.quotes.length >= 3);
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

test('习题守住五层与三个问题：可借与不可借分得清', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.match(raw, /借的是什么/);
  assert.match(raw, /硝石矾石/);
  assert.match(raw, /独立的验证路径/);
});
