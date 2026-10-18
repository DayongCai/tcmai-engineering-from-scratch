'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { NINETEEN, search, distribution, byBelong } = require('./main.js');

test('共 19 条，编号 1..19 连续', () => {
  assert.strictEqual(NINETEEN.length, 19);
  NINETEEN.forEach((x, i) => assert.strictEqual(x.n, i + 1));
});

test('分类分布：脏5 火5 热4 湿1 风1 寒1 部位2', () => {
  assert.deepStrictEqual(distribution(), { 脏: 5, 火: 5, 热: 4, 湿: 1, 风: 1, 寒: 1, 部位: 2 });
});

test('五脏各一条：肝 肾 肺 脾 心', () => {
  const d = byBelong();
  for (const k of ['肝', '肾', '肺', '脾', '心']) assert.strictEqual(d[k], 1);
});

test('「水液」命中两条（浑浊属热 / 澄澈清冷属寒），不许只给一条', () => {
  const r = search('水液');
  assert.strictEqual(r.length, 2);
  assert.deepStrictEqual(r.map((x) => x.belong).sort(), ['寒', '热']);
});

test('每条都带边界：缺边界等于把归纳读成判据', () => {
  for (const x of NINETEEN) assert.ok(x.boundary && x.boundary.length > 8, `${x.n} 缺边界`);
});

test('未命中的线索返回空数组，不硬套', () => {
  assert.deepStrictEqual(search('燥'), []);
});

test('空检索词抛错', () => {
  assert.throws(() => search('  '), /不能为空/);
});
