'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { scoreOf, rank, RULES } = require('./main.js');

const liverQi = RULES.find((r) => r.id === '肝气郁结');
const liverFire = RULES.find((r) => r.id === '肝火上炎');

test('肝气郁结：典型四症全覆盖 = 1.0，无缺口', () => {
  const r = scoreOf(liverQi, ['胸胁胀满', '善太息', '情志抑郁', '脉弦']);
  assert.strictEqual(r.score, 1);
  assert.deepStrictEqual(r.missing, []);
});

test('只有主症时：缺口为空但分数不等于 1（次症是加权项）', () => {
  const r = scoreOf(liverQi, ['胸胁胀满', '善太息']);
  assert.strictEqual(r.missing.length, 0);
  assert.ok(r.score > 0.6 && r.score < 1);
});

test('缺主症时：missing 必须报出缺的那一条', () => {
  const r = scoreOf(liverFire, ['口苦', '急躁易怒']);
  assert.deepStrictEqual(r.missing, ['目赤']);
});

test('两证并存时：排序与竞争证候都要给出', () => {
  const r = rank(['胸胁胀满', '善太息', '目赤', '口苦', '脉弦']);
  assert.strictEqual(r.candidates[0].id, '肝气郁结');
  assert.ok(r.rivals.includes('肝火上炎'));
});

test('未过阈值：passed=false，但仍出现在候选里（不许静默丢弃）', () => {
  const r = rank(['脉弦']);
  assert.ok(r.candidates.every((c) => c.passed === false));
});
