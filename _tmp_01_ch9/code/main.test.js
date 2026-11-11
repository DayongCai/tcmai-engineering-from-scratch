'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { bonferroni, bh, familyError } = require('./main.js');

test('familyError：m 越大，至少一次假阳性的概率越高', () => {
  assert.ok(familyError(0.05, 20) > familyError(0.05, 10));
  assert.strictEqual(familyError(0.05, 1), 0.05);
});

test('Bonferroni 阈值 = α/m', () => {
  assert.strictEqual(+bonferroni([0.01, 0.02, 0.9, 0.5]).threshold.toFixed(5), 0.0125);
});

test('Bonferroni 比 BH 保守（拒绝集不会更大）', () => {
  const p = [0.001, 0.008, 0.021, 0.03, 0.041, 0.12];
  assert.ok(bonferroni(p).rejected.length <= bh(p).rejected.length);
});

test('BH 拒绝的是排序后的前 k 个，而不是所有过阈值的', () => {
  // 0.05 单独看显著，但排在最后一名，不应被拒绝
  const r = bh([0.04, 0.045, 0.05, 0.2, 0.9]);
  assert.deepStrictEqual(r.rejected, []);
});

test('BH 在明显分离的数据上拒绝前两个', () => {
  const r = bh([0.001, 0.008, 0.021, 0.03, 0.041, 0.12, 0.25, 0.4, 0.62, 0.9]);
  assert.deepStrictEqual(r.rejected, [0, 1]);
});

test('单个 p 值：BH 与 Bonferroni 判定一致', () => {
  assert.deepStrictEqual(bh([0.01]).rejected, [0]);
  assert.deepStrictEqual(bonferroni([0.01]).rejected, [0]);
});
