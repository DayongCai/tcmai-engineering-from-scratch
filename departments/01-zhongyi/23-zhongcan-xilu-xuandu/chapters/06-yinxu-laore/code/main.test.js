'use strict';
/**
 * 第 6 章的断言：方剂首数、三方组成、入口差异的原话、引文、习题，全部现算。
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

test('治阴虚劳热方十一首，三方药味数与正文逐个相等', () => {
  assert.strictEqual(r.series, 11);
  assert.strictEqual(r.facts.length, 4);
  for (const f of r.facts) {
    assert.notStrictEqual(f.want, null, f.label + '：正文里没找到这个数');
    assert.strictEqual(f.got, f.want, f.label + '：现算 ' + f.got + ' ≠ 正文 ' + f.want);
  }
});

test('三方的关键药味确实在方下组成里', () => {
  const [zisheng, shiquan, liquan] = r.compositions;
  for (const h of ['于术', '生山药', '生鸡内金']) assert.ok(zisheng.herbs.includes(h), '资生汤缺 ' + h);
  for (const h of ['三棱', '莪术', '丹参']) assert.ok(shiquan.herbs.includes(h), '十全育真汤缺 ' + h);
  for (const h of ['生赭石', '人参']) assert.ok(liquan.herbs.includes(h), '醴泉饮缺 ' + h);
});

test('三条入口与禁区都有原话可查', () => {
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

test('习题守住两条路：纳与瘀，不是轻重两档', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8');
  assert.match(raw, /吃了不长|饮食不壮筋力/);
  assert.match(raw, /鸡内金|三味都在脾胃/);
  assert.match(raw, /结核未排除前|在结核未被排除之前/);
});
