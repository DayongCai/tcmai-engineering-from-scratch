'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { vec, cos, neighbors, WEI, JING } = require('./main.js');

test('向量长度 = 1（气）+ 5（味）+ 12（经）', () => {
  assert.strictEqual(vec({ qi: '温', wei: ['辛'], jing: ['肺'] }).length, 1 + WEI.length + JING.length);
});

test('「微苦」归一到「苦」，但不会同时点亮别的味位', () => {
  const v = vec({ qi: '温', wei: ['辛', '微苦'], jing: ['肺'] });
  const weiPart = v.slice(1, 1 + WEI.length);
  assert.deepStrictEqual(weiPart, [1, 0, 0, 1, 0]); // 辛=1 苦=1
});

test('气是有序轴：温与热的距离小于温与寒', () => {
  const a = vec({ qi: '温', wei: [], jing: [] });
  const b = vec({ qi: '热', wei: [], jing: [] });
  const c = vec({ qi: '寒', wei: [], jing: [] });
  assert.ok(Math.abs(a[0] - b[0]) < Math.abs(a[0] - c[0]));
});

test('麻黄查询：桂枝第一，石膏末位；不回自己', () => {
  const r = neighbors('麻黄');
  assert.strictEqual(r[0].name, '桂枝');
  assert.strictEqual(r[r.length - 1].name, '石膏');
  assert.ok(!r.some((x) => x.name === '麻黄'));
});

test('零向量不产生 NaN', () => {
  assert.strictEqual(cos([0, 0], [1, 0]), 0);
});
