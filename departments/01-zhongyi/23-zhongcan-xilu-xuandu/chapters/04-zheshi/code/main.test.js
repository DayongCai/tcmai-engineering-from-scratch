'use strict';
/**
 * 第 4 章的断言：六条特长的条数、生煅边界、妊娠边界、引文、习题，全部现算。
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

test('正文的 176 与 25 都能由 units.json 现算', () => {
  for (const f of r.facts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('《论胃气不降治法》里数得出六条，与正文的「六」一致', () => {
  assert.strictEqual(r.six.counted, 6, '只数到 ' + r.six.counted + ' 条');
  assert.strictEqual(r.six.want, 6);
  assert.strictEqual(r.six.marks.length, r.six.counted);
});

test('每条读法都在原文里有字面依据', () => {
  assert.ok(r.markers.length >= 6);
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
  assert.ok(r.quiz.spread >= 3, '正确项只落在 ' + r.quiz.spread + ' 个位置');
});

test('习题不把赭石写成万能重镇：守住涩与达、药不胜病、妊娠条件', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.match(raw, /涩|下达/);
  assert.match(raw, /药不胜病/);
  assert.match(raw, /受妊之初/);
});
