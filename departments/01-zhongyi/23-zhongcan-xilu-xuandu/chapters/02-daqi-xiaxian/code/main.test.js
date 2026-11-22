'use strict';
/**
 * 第 2 章的断言：方剂数、药名条目数、医案编排、引文、习题，全部从 units.json 与正文现算。
 * 底本一改、正文改数、引文错字、quiz 跑题，这里都会红。
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

test('正文引的每个数都能由 units.json 现算', () => {
  assert.ok(r.facts.length >= 6, '正文写的数太少');
  for (const f of r.facts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('治大气下陷方四首，升陷汤方下五味与正文表一致', () => {
  const f = r.facts.find((x) => x.label === '治大气下陷方首数');
  assert.strictEqual(f.got, 4);
  assert.strictEqual(r.composition.herbs.length, 5);
  assert.ok(r.composition.has, '升陷汤方下缺了正文表里的某一味：' + r.composition.herbs.join('、'));
});

test('气病门 9 案：前 5 案立本证，后 4 案排近邻', () => {
  assert.strictEqual(r.arrangement.titles.length, 9);
  assert.ok(r.arrangement.headOk, '前五案不都以「大气」为题');
  assert.ok(r.arrangement.tailOk, '后四案里有大气下陷案，编排与正文描述不符');
});

test('正文每一条带出处的引文都逐字落在所标单元里', () => {
  assert.ok(r.quotes.length >= 5, '引文太少，不足以支撑四组鉴别');
  assert.deepStrictEqual(r.quoteMiss.map((q) => q.locator), [], '有引文查不到');
  for (const q of r.quotes) {
    assert.ok(q.unit, q.locator + ' 没有对应单元');
    assert.ok(q.hanzi >= 8, q.locator + ' 的引文只有 ' + q.hanzi + ' 字，太短不足以核');
  }
});

test('习题：≥5 题、三段齐、4 选项、解释≥30 汉字', () => {
  assert.ok(r.quiz.count >= 5);
  assert.ok(r.quiz.stageOk, '缺 pre/check/post 任一段');
  assert.ok(r.quiz.optionOk);
  assert.ok(r.quiz.correctOk);
  assert.ok(r.quiz.explainOk, '有题 explain 不足 30 汉字');
});

test('习题：接地 check ≥2 道，正确项不集中', () => {
  assert.ok(r.quiz.groundedCheck >= 2, '接地 check 题只有 ' + r.quiz.groundedCheck + ' 道');
  assert.ok(r.quiz.spread >= 3, '正确项只落在 ' + r.quiz.spread + ' 个位置');
});

test('习题守住本章三条判据：命名顺序、必不肩息、白术之分', () => {
  const text = JSON.stringify(r.quiz.items);
  assert.match(text, /先有十几年的临床印象|先有临床/);
  assert.match(text, /必不肩息/);
  assert.match(text, /升陷汤不用白术/);
});
