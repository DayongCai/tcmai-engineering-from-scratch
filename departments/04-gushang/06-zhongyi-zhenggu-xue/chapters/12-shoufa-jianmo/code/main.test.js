'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { needForce, assess, RATIO_MAX } = require('./main.js');

test('所需牵引力随体重线性增长', () => {
  assert.ok(needForce(70, '上肢') > needForce(60, '上肢'));
  assert.strictEqual(needForce(60, '上肢'), 6); // 0.10 × 60
});

test('下肢系数大于上肢：同体重下需要更大的力', () => {
  assert.ok(needForce(60, '下肢') > needForce(60, '上肢'));
});

test('肌肉发达者需求上调 15%', () => {
  assert.strictEqual(needForce(60, '上肢', true), 6.9);
});

test('ratio 落在 [1.0, 1.3] 判 ok，超出判 over', () => {
  assert.strictEqual(assess(6, 60, '上肢', 12).verdict, 'ok');
  assert.strictEqual(assess(7.8, 60, '上肢', 12).verdict, 'ok');
  assert.strictEqual(assess(12, 60, '上肢', 12).verdict, 'over');
  assert.strictEqual(assess(4, 60, '上肢', 12).verdict, 'under');
});

test('力矩随手位（力臂）线性变化，力不变时手位越远力矩越大', () => {
  const near = assess(8, 60, '上肢', 8);
  const far = assess(8, 60, '上肢', 16);
  assert.strictEqual(near.ratio, far.ratio); // 力没变
  assert.ok(far.moment > near.moment);
});

test('未知部位抛错，不许默认成上肢', () => {
  assert.throws(() => needForce(60, '躯干'), /未知部位/);
});

test('边界：恰好在 1.3 倍时仍判 ok（闭区间）', () => {
  const need = needForce(60, '上肢');
  const r = assess(need * RATIO_MAX, 60, '上肢', 10);
  assert.strictEqual(r.verdict, 'ok');
});
