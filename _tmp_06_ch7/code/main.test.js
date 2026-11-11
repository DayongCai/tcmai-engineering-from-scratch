'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { stats } = require('./main.js');

test('全对的矩阵：po=1，kappa=1', () => {
  const r = stats([[5, 0], [0, 5]]);
  assert.strictEqual(r.po, 1);
  assert.strictEqual(r.kappa, 1);
});

test('类别极不平衡且全判一类：一致率高但 kappa=0', () => {
  const r = stats([[90, 0, 0], [10, 0, 0], [5, 0, 0]]);
  assert.ok(r.po > 0.8);
  assert.strictEqual(r.kappa, 0);
});

test('PABAK 对不平衡不敏感，与 kappa 形成对照', () => {
  const r = stats([[90, 0, 0], [10, 0, 0], [5, 0, 0]]);
  assert.ok(r.pabak > 0.5); // 2×0.857−1
  assert.notStrictEqual(r.pabak, r.kappa);
});

test('均衡且几乎全对：kappa 明显高于 0.8', () => {
  const r = stats([[30, 1, 0], [1, 29, 1], [0, 1, 30]]);
  assert.ok(r.kappa > 0.85);
});

test('非方阵与空矩阵必须抛错', () => {
  assert.throws(() => stats([[1, 2], [3, 4], [5, 6]]), /方阵/);
  assert.throws(() => stats([[0, 0], [0, 0]]), /为空/);
});
