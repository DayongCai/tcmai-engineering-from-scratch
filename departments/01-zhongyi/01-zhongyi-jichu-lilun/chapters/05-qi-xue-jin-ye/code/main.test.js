'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { concepts, relations, graph, simulate, truncated } = require('./main.js');

test('五概念各 2 小节 4 段；合计 20 段 2,807 字', () => {
  const cs = concepts();
  assert.strictEqual(cs.length, 5);
  for (const c of cs) {
    assert.strictEqual(c.subs, 2, `${c.name} 小节数`);
    assert.strictEqual(c.paras, 4, `${c.name} 段数`);
  }
  assert.strictEqual(cs.reduce((n, c) => n + c.paras, 0), 20);
  assert.strictEqual(cs.reduce((n, c) => n + c.chars, 0), 2807);
  assert.deepStrictEqual(cs.map((c) => c.name), ['精', '气', '血', '津液', '神']);
});

test('关系 7 条边、4 个节点，全部带出处节号', () => {
  const e = relations();
  assert.strictEqual(e.length, 7);
  assert.deepStrictEqual([...new Set(e.flatMap((x) => [x.from, x.to]))].sort(), ['气', '津液', '精', '血'].sort());
  for (const x of e) assert.match(x.sec, /^4\.[1-6]/);
});

test('气→血 三条（生血/行血/摄血），来自 4.6.1 原句', () => {
  const e = relations().filter((x) => x.from === '气' && x.to === '血');
  assert.deepStrictEqual(e.map((x) => x.label).sort(), ['气能行血', '气能生血', '气能摄血'].sort());
  assert.ok(e.every((x) => x.sec === '4.6.1'));
});

test('精→血 是单向边：教材只说「精血同源」，没说血能生精', () => {
  const e = relations();
  const jing = e.filter((x) => x.from === '精' && x.to === '血');
  assert.strictEqual(jing.length, 1);
  assert.strictEqual(e.filter((x) => x.from === '血' && x.to === '精').length, 0);
});

test('有反向对应的边 6 条（7 条里只有精→血 没有反向）', () => {
  const g = graph();
  const paired = g.edges.filter((e) => g.edges.some((f) => f.from === e.to && f.to === e.from));
  assert.strictEqual(paired.length, 6);
});

test('守恒试写：总量从 3.000 掉到 1.792（漂移 −1.208），证明教材无守恒量', () => {
  const s = simulate();
  assert.strictEqual(s.rows.length, 13);
  assert.strictEqual(s.rows[0].total, 3);
  assert.strictEqual(s.rows[12].total, 1.7917);
  assert.ok(Math.abs(s.drift + 1.2083) < 1e-3);
});

test('原文截断：19 段以非句末标点收尾（工作簿单元格被切）', () => {
  const tr = truncated();
  assert.strictEqual(tr.length, 19);
  const hit = tr.find((x) => x.sec === '4.6.1');
  assert.ok(hit, '4.6.1 应被识别为截断');
  assert.strictEqual(hit.len, 48);
});
