'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { AXES, scoreAxes } = require('./main.js');

test('四轴齐备，且每轴至少两组配对（少一轴就等于换了一套阴阳）', () => {
  assert.strictEqual(AXES.length, 4);
  for (const a of AXES) assert.ok(a.pairs.length >= 2, `${a.id} 配对不足`);
});

test('无参照点必须抛错，不许默认「与常人比」', () => {
  assert.throws(() => scoreAxes(['舌红'], ''), /缺参照点/);
});

test('单一证据时，其余轴为 null 而不是 0', () => {
  const r = scoreAxes(['舌红'], '与平素比');
  const cold = r.find((x) => x.id === '寒热');
  assert.ok(cold.side > 0); // 舌红 = 阳侧
  assert.strictEqual(r.find((x) => x.id === '升降出入').side, null);
});

test('同一轴内正负证据相抵 = 平衡，而不是无证据', () => {
  const r = scoreAxes(['恶热', '畏寒'], '与平素比');
  const cold = r.find((x) => x.id === '寒热');
  assert.strictEqual(cold.side, 0);
  assert.deepStrictEqual(cold.evidence, ['+恶热', '-畏寒']);
});

test('偏侧值落在 −1..1，且等于（正−负）/总数', () => {
  const r = scoreAxes(['上窍', '腠理', '四肢'], '与对侧比');
  const up = r.find((x) => x.id === '升降出入');
  assert.strictEqual(up.side, 1);
  for (const x of r) if (x.side !== null) assert.ok(x.side >= -1 && x.side <= 1);
});

test('证据行保留符号，便于回指原文正负方向', () => {
  const r = scoreAxes(['痰黄'], '与昨日比');
  assert.deepStrictEqual(r.find((x) => x.id === '清浊').evidence, ['+痰黄']);
});
