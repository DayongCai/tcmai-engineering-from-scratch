'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { EDGES_FOOD, EDGES_DRINK, buildGraph, topoSort, convergence } = require('./main.js');

test('两条路径均无环，可拓扑排序', () => {
  const f = topoSort(EDGES_FOOD);
  const d = topoSort(EDGES_DRINK);
  assert.strictEqual(f[0], '胃');
  assert.strictEqual(d[0], '胃');
  assert.ok(f.length >= 10, `食气节点 ${f.length}`);
  assert.ok(d.length >= 5, `饮入节点 ${d.length}`);
});

test('汇点唯一：肺（两条路径都必经）', () => {
  assert.deepStrictEqual(convergence(), ['肺']);
});

test('食气路径以「气口」为终点分支，且含「筋」这条支路', () => {
  const { adj } = buildGraph(EDGES_FOOD);
  const sinks = [...adj.entries()].filter(([, v]) => v.length === 0).map(([k]) => k).sort();
  assert.deepStrictEqual(sinks, ['气口', '筋']);
});

test('饮入路径终点是「五经并行」', () => {
  const { adj } = buildGraph(EDGES_DRINK);
  const sinks = [...adj.entries()].filter(([, v]) => v.length === 0).map(([k]) => k);
  assert.deepStrictEqual(sinks, ['五经并行']);
});

test('环检测有效：人为加「肺→胃」必须抛错', () => {
  const bad = [...EDGES_DRINK, { from: '肺', to: '胃', quote: '（人为加边，用于验证环检测）' }];
  assert.throws(() => topoSort(bad), /存在环/);
});

test('每条边都带原文依据，不留"凭记忆"的边', () => {
  for (const e of [...EDGES_FOOD, ...EDGES_DRINK]) {
    assert.ok(e.from && e.to, JSON.stringify(e));
    assert.ok(typeof e.quote === 'string' && e.quote.length >= 4, `缺依据：${e.from}→${e.to}`);
  }
});

test('边数与原材料一致：食气 11 · 饮入 5', () => {
  assert.strictEqual(EDGES_FOOD.length, 11);
  assert.strictEqual(EDGES_DRINK.length, 5);
});
