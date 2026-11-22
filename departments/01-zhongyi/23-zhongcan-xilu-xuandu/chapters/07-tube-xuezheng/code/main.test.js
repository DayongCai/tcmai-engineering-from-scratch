'use strict';
/**
 * 第 7 章的断言：十一首、七方表、六个岔口、两条禁忌的原话、引文、习题，全部现算。
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

test('治吐衄方十一首、七方表七行、六个岔口，全部现算', () => {
  assert.strictEqual(r.facts.length, 4);
  for (const f of r.facts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('七方表的方名都在医论 67 正文里出现', () => {
  assert.strictEqual(r.table.names.length, 7);
  assert.strictEqual(new Set(r.table.names).size, 7);
});

test('两条禁忌与柴胡二钱案都有原话可查', () => {
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

test('习题守住主轴与两条禁忌：降胃、忌炭药、忌升提', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.match(raw, /以降胃之品为主/);
  assert.match(raw, /经络瘀塞|血痹虚劳/);
  assert.match(raw, /升在气逆的人是催命的/);
});
