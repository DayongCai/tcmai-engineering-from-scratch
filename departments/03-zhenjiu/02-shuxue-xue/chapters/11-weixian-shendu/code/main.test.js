'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { kOf, limitOf, check } = require('./main.js');

test('BMI 分段：四档系数单调不减', () => {
  const ks = [18, 22, 26, 32].map(kOf);
  assert.deepStrictEqual(ks, [0.8, 1.0, 1.25, 1.4]);
  for (let i = 1; i < ks.length; i += 1) assert.ok(ks[i] >= ks[i - 1]);
});

test('安全深度上限随 BMI 增大', () => {
  assert.ok(limitOf('风池', 30) > limitOf('风池', 20));
  assert.strictEqual(limitOf('人迎', 22), 0.3);
});

test('禁用方向：无论多浅都 forbid，且理由指向重要结构', () => {
  const r = check('风池', 22, '向内上方', 0.3);
  assert.strictEqual(r.verdict, 'forbid');
  assert.match(r.reason, /椎动脉|延髓/);
});

test('超过上限：forbid 并报出上限', () => {
  const r = check('风池', 22, '向鼻尖', 1.5);
  assert.strictEqual(r.verdict, 'forbid');
  assert.match(r.reason, /1(\.00)? 寸/);
});

test('接近上限（>80%）：warn 而不是 allow', () => {
  assert.strictEqual(check('风池', 22, '向鼻尖', 0.9).verdict, 'warn');
  assert.strictEqual(check('风池', 22, '向鼻尖', 0.5).verdict, 'allow');
});

test('未收录穴位必须抛错，不许静默放过', () => {
  assert.throws(() => check('不存在的穴', 22, '直刺', 0.5), /未收录穴位/);
});
