'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { RULES, decide, reverseType } = require('./main.js');

test('规则一：有余先治本，不足先治标', () => {
  assert.deepStrictEqual(decide({ 有余: true }).order, ['本', '标']);
  assert.deepStrictEqual(decide({ 不足: true }).order, ['标', '本']);
});

test('冲突：有余 + 先病后中满 → 中满胜出（先治标）', () => {
  const r = decide({ 有余: true, 先病后中满: true });
  assert.strictEqual(r.winner, '中满');
  assert.deepStrictEqual(r.order, ['标', '本']);
  assert.deepStrictEqual(r.overridden, ['有余不足']);
});

test('冲突：小大不利压过有余', () => {
  const r = decide({ 小大不利: true, 有余: true });
  assert.strictEqual(r.winner, '二便');
  assert.deepStrictEqual(r.order, ['标', '本']);
});

test('时序反转：中满在先 → 中满即本，先治本', () => {
  const r = decide({ 中满在先: true, 不足: true });
  assert.strictEqual(r.winner, '中满在先');
  assert.deepStrictEqual(r.order, ['本', '标']);
});

test('时序反转：二便不利在先 → 先治本', () => {
  const r = decide({ 二便不利在先: true, 不足: true });
  assert.strictEqual(r.winner, '二便在先');
  assert.deepStrictEqual(r.order, ['本', '标']);
});

test('信息不足时不猜：order 为 null 且说明缺什么', () => {
  const r = decide({});
  assert.strictEqual(r.order, null);
  assert.strictEqual(r.winner, null);
  assert.match(r.why, /缺/);
});

test('每条规则都带原文与优先级，且优先级是有序整数', () => {
  for (const r of RULES) {
    assert.ok(r.quote.length > 10, r.id);
    assert.ok([1, 2, 3].includes(r.priority), r.id);
    assert.ok(r.id);
  }
  assert.strictEqual(RULES.filter((r) => r.priority === 1).length, 1);
});

test('正治/反治：微→正治（逆），甚→反治（从）并带「其始则同」之辨', () => {
  assert.strictEqual(reverseType('微').type, '正治');
  assert.strictEqual(reverseType('微').mode, '逆');
  const f = reverseType('甚');
  assert.strictEqual(f.type, '反治');
  assert.strictEqual(f.mode, '从');
  assert.match(f.caveat, /其始则同/);
});

test('未知病势抛错（原文只有微/甚两档，不许自造第三档）', () => {
  assert.throws(() => reverseType('中'), /未知病势/);
});
