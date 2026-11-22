'use strict';
/**
 * 第 8 章的断言：词频、医案数、两张方的组成、五条朕兆与腖案的原话、引文、习题。
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

test('正文的词频与脑充血门案数都能现算', () => {
  for (const f of r.facts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('建瓴汤八味、镇肝熄风汤十二味，且两方都以牛膝为主药', () => {
  assert.strictEqual(r.formulas.jianling.herbs.length, 8, '建瓴汤 ' + r.formulas.jianling.herbs.length + ' 味');
  assert.strictEqual(r.formulas.zhenganUnit.length, 12, '镇肝熄风汤 ' + r.formulas.zhenganUnit.length + ' 味');
  assert.ok(r.formulas.sameCount, '正文与单元的镇肝熄风汤组成不一致');
  assert.ok(r.formulas.bothHaveNiuxi, '两方并非都含牛膝');
});

test('五条朕兆、血压读数、囟门塌陷、黄芪八钱各有原话', () => {
  for (const m of r.markers) assert.ok(m.hit, m.label + '：在《' + m.where + '》里查不到「' + m.term + '」');
});

test('正文每一条带出处的引文都逐字落在所标单元里', () => {
  assert.ok(r.quotes.length >= 5);
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

test('习题守住：借名须译回、症状消失不等于病愈、脉实不可补气升阳', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  const q0 = r.quiz.items[0];
  assert.match(q0.right, /译回|内经/, '第一题的正确项应当是把西名译回《内经》，不是照用');
  assert.match(raw, /症状消失不等于病愈/);
  assert.match(raw, /发表药助血上行/);
});
