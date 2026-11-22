'use strict';
/**
 * 第 3 章的断言：正文字数、药名条目、三个动作的原话、引文、习题，全部现算。
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

test('正文的 176 与 36 都能由 units.json 现算', () => {
  assert.ok(r.facts.length >= 2);
  for (const f of r.facts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('正文说石膏解是最长的一篇药解，排序确实如此', () => {
  assert.strictEqual(r.longest.top, '1．石膏解');
  assert.ok(r.longest.hanzi > r.longest.secondHanzi, '石膏解并不比次长者长');
});

test('生用、分服、热退不必尽剂、煅者外用，四条都各有原话', () => {
  assert.ok(r.markers.length >= 5);
  for (const m of r.markers) assert.ok(m.hit, m.label + '：在《' + m.where + '》里查不到「' + m.term + '」');
});

test('「煅」是石膏解反复处理的对象，不是顺带一提', () => {
  assert.ok(r.duan.times >= 5, '石膏解里「煅」只出现 ' + r.duan.times + ' 次，与正文的靶子说法不符');
  assert.ok(r.duan.hanzi > 3000, '石膏解只有 ' + r.duan.hanzi + ' 字');
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

test('习题守住生煅边界与分服原则', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.match(raw, /煅/);
  assert.match(raw, /分四五次|分服/);
  assert.match(raw, /以小心行其放胆/);
});
