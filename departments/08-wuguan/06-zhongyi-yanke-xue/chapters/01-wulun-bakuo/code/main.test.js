'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { WULUN, BAKUO, locate } = require('./main.js');

test('五轮与五脏一一对应，且没有重复轮位', () => {
  const pairs = WULUN.map((w) => `${w.lun}:${w.zang}`);
  assert.deepStrictEqual(pairs, ['肉轮:脾', '血轮:心', '气轮:肺', '风轮:肝', '水轮:肾']);
});

test('白睛 → 气轮 → 肺', () => {
  const r = locate('白睛红赤');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].zang, '肺');
});

test('瞳神 → 水轮 → 肾', () => {
  const r = locate('瞳神不清');
  assert.strictEqual(r[0].zang, '肾');
});

test('跨区体征返回多候选，不擅自取一个', () => {
  const r = locate('眦部白睛充血');
  assert.strictEqual(r.length, 2);
  assert.deepStrictEqual(r.map((x) => x.lun).sort(), ['气轮', '血轮']);
});

test('无法定位时返回 null，禁止默认归轮', () => {
  assert.strictEqual(locate('视物模糊'), null);
});

test('八廓被标记为有争议，且不提供单值配属', () => {
  assert.strictEqual(BAKUO.disputed, true);
  assert.strictEqual(BAKUO.names.length, 8);
  assert.ok(!('map' in BAKUO) || !BAKUO.map);
});
