'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { NEEDLES, toCm, pick } = require('./main.js');

test('九针齐备，序号 1..9，每支都有出处', () => {
  assert.strictEqual(NEEDLES.length, 9);
  NEEDLES.forEach((x, i) => {
    assert.strictEqual(x.n, i + 1);
    assert.match(x.source, /灵枢/);
  });
});

test('长度跨度：最短 1.6 寸、最长 7 寸（长针）', () => {
  const cuns = NEEDLES.map((x) => x.cun);
  assert.strictEqual(Math.min(...cuns), 1.6);
  assert.strictEqual(Math.max(...cuns), 7);
});

test('折算给区间不给点值：1.6 寸 ≈ 3.70–3.76 cm', () => {
  const c = toCm(1.6);
  assert.deepStrictEqual(c, { min: 3.7, max: 3.76 });
  assert.notStrictEqual(c.min, c.max, '点值等于把不确定性藏起来');
});

test('非正长度抛错', () => {
  assert.throws(() => toCm(0), /正数/);
});

test('按用途选针：「脓」同时命中锋针与铍针，不许只给一支', () => {
  const r = pick('脓').map((x) => x.name);
  assert.deepStrictEqual(r.sort(), ['铍针', '锋针'].sort());
});

test('无命中返回空数组，不返回最相近的一支', () => {
  assert.deepStrictEqual(pick('不存在的用途'), []);
  assert.throws(() => pick('  '), /不能为空/);
});
