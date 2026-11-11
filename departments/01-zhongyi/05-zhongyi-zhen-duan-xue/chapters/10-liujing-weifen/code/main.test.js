'use strict';

/**
 * 第 10 章 单测：教材第 10/11/12 章的字数、13 节点、8 条传变
 *   node --test code/main.test.js
 */

const assert = require('node:assert');
const test = require('node:test');
const {
  bookShape, systems, totals, nodesTable, chains, roles, sections, gaps,
  chapter, corpus, TOTAL_NODES,
} = require('./main.js');

test('教材本体：14 章 / 46 节 / 105 小节 / 196 段 / 22,215 字，sha256 051d830a…', () => {
  const b = bookShape();
  assert.strictEqual(b.chapters, 14);
  assert.strictEqual(b.secs, 46);
  assert.strictEqual(b.subs, 105);
  assert.strictEqual(b.paras, 196);
  assert.strictEqual(b.chars, 22215);
  assert.ok(b.sha256.startsWith('051d830a'));
});

test('三章字数：799 + 612 + 356 = 1,767，逐段重算与声明一致', () => {
  const t = totals();
  assert.deepStrictEqual(t.rows.map((r) => r.ch), ['10', '11', '12']);
  assert.deepStrictEqual(t.rows.map((r) => r.chars), [799, 612, 356]);
  assert.deepStrictEqual(t.rows.map((r) => r.declared), [799, 612, 356]);
  assert.ok(t.rows.every((r) => r.match));
  assert.strictEqual(t.chars, 1767);
});

test('三套坐标的节点：6 + 4 + 3 = 13，且每个节点名都能在教材逐字找到', () => {
  const t = totals();
  assert.strictEqual(TOTAL_NODES, 13);
  assert.strictEqual(t.nodes, 13);
  assert.deepStrictEqual(t.rows.map((r) => r.nodes), [6, 4, 3]);
  assert.ok(t.rows.every((r) => r.allPresent), '有节点名在教材里找不到');
  const nt = nodesTable();
  assert.strictEqual(nt.length, 13);
  assert.deepStrictEqual(nt.filter((n) => n.system === '六经').map((n) => n.name),
    ['太阳', '阳明', '少阳', '太阴', '少阴', '厥阴']);
  assert.deepStrictEqual(nt.filter((n) => n.system === '卫气营血').map((n) => n.name),
    ['卫分', '气分', '营分', '血分']);
  assert.deepStrictEqual(nt.filter((n) => n.system === '三焦').map((n) => n.name),
    ['上焦', '中焦', '下焦']);
});

test('每节点平均 135.9 字；三焦最薄（356 字 / 每节点 118.7），卫气营血最厚（153.0）', () => {
  const t = totals();
  assert.strictEqual(t.avgPerNode, 135.9);
  assert.strictEqual(t.thinnest.name, '三焦');
  assert.strictEqual(t.thinnest.chars, 356);
  assert.strictEqual(t.thinnest.perNode, 118.7);
  assert.strictEqual(t.thickestPerNode.name, '卫气营血');
  assert.strictEqual(t.thickestPerNode.perNode, 153);
  assert.strictEqual(t.thinRatio, 78);
});

test('传变：六经 5 式 / 卫气营血 2 / 三焦 1 条（含顺逆两支）= 8 条 9 支', () => {
  const t = totals();
  assert.deepStrictEqual(t.rows.map((r) => r.groups), [5, 2, 1]);
  assert.strictEqual(t.groupSum, 8);
  assert.strictEqual(t.branchSum, 9);
  const text10 = corpus(chapter('10'));
  for (const w of ['循经传', '越经传', '直中', '合病', '并病']) {
    assert.ok(text10.includes(w), `第10章缺 ${w}`);
  }
  assert.ok(corpus(chapter('11')).includes('顺传') && corpus(chapter('11')).includes('逆传'));
  assert.ok(corpus(chapter('12')).includes('顺传') && corpus(chapter('12')).includes('逆传'));
});

test('顺序来自教材的箭头链，不靠记忆：三条链全部命中', () => {
  const ch = chains();
  assert.strictEqual(ch.length, 3);
  assert.ok(ch.every((c) => c.found), '有箭头链在教材里找不到');
  assert.deepStrictEqual(ch.map((c) => c.nodes), [6, 4, 3]);
});

test('三套坐标不是同一件事：三章各自的定位句都在教材里', () => {
  const ro = roles();
  assert.ok(ro.every((r) => r.found), '定位句缺失');
  assert.ok(corpus(chapter('10')).includes('外感热病'));
  assert.ok(corpus(chapter('11')).includes('温病'));
  assert.ok(corpus(chapter('12')).includes('三焦辨证与卫气营血辨证相辅相成'));
  // 三章是连号并列，不是一章内的三节
  assert.deepStrictEqual(systems().map((s) => s.ch), ['10', '11', '12']);
});

test('缺口：12.2 传变段只有 77 字；六经分类 607 字 / 传变 192 字', () => {
  const g = gaps();
  assert.strictEqual(g.thinSection.no, '12.2');
  assert.strictEqual(g.thinSection.chars, 77);
  assert.deepStrictEqual(g.liujingSplit, [['10.1', 607], ['10.2', 192]]);
  assert.deepStrictEqual(g.subTyped, ['太阳', '少阴']);
  const secs = sections();
  assert.strictEqual(secs.length, 6);
  assert.strictEqual(secs.reduce((n, s) => n + s.chars, 0), 1767);
});
