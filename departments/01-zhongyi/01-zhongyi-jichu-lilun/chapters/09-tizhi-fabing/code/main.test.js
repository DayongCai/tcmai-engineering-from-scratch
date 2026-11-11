'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { systems, mapping, onset, risk, PRIOR, SUSCEPT, JIUZHI } = require('./main.js');

test('经典 5 形 × 5 音 = 25 人；教材称「二十五人」', () => {
  const s = systems();
  assert.strictEqual(s.classic.shapes.length, 5);
  assert.strictEqual(s.classic.notes.length, 5);
  assert.strictEqual(s.classic.quarters, 25);
  assert.strictEqual(s.classic.stated25, true);
});

test('现代九分法 9 质，全部在教材出现；量表 60 条目有原文', () => {
  const s = systems();
  assert.strictEqual(s.modern.n, 9);
  assert.strictEqual(s.modern.allMentioned, true);
  assert.deepStrictEqual(s.modern.types, JIUZHI);
  assert.strictEqual(s.modern.scaleItems, 60);
  assert.strictEqual(s.modern.scaleCited, true);
});

test('双轨映射：5 形 → 10 条边 → 8 个质（平和质不在映射里）', () => {
  const m = mapping();
  assert.strictEqual(m.rows.length, 5);
  assert.strictEqual(m.pairs, 10);
  assert.strictEqual(m.nDistinct, 8);
  assert.ok(!m.distinctTargets.includes('平和质'));
  assert.strictEqual(m.declaredNonOneToOne, true);
});

test('每形对 2 质；阴虚同时来自木与火（故不能反推）', () => {
  const m = mapping();
  assert.ok(m.rows.every((r) => r.types.length === 2));
  const from = m.rows.filter((r) => r.types.includes('阴虚')).map((r) => r.shape);
  assert.deepStrictEqual(from.sort(), ['木', '火'].sort());
});

test('发病类型 7 种、影响因素 3 类', () => {
  const o = onset();
  assert.strictEqual(o.types.length, 7);
  assert.deepStrictEqual(o.types.map((x) => x.name), ['感邪即发', '伏而后发', '徐发', '继发', '合病', '并病', '复发']);
  assert.deepStrictEqual(o.factors, ['体质因素', '情志因素', '生活因素']);
  assert.strictEqual(o.paras, 20);
});

test('风险分层：先验合计 1，痰湿质居首（因教材列 3 个易感目标）', () => {
  const r = risk();
  assert.strictEqual(r.priorSum, 1);
  assert.strictEqual(r.rows[0].type, '痰湿质');
  assert.strictEqual(r.rows[0].score, 0.33);
  assert.strictEqual(r.rows.filter((x) => x.n === 0).length, 6);
  assert.deepStrictEqual(r.top3, ['痰湿质', '阳虚质', '阴虚质']);
});

test('先验是自设的：9 个质都有值，且教材未给任何患病率（防误用为风险结论）', () => {
  assert.strictEqual(Object.keys(PRIOR).length, 9);
  assert.strictEqual(Object.keys(SUSCEPT).length, 3);
  const sum = Object.values(PRIOR).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});
