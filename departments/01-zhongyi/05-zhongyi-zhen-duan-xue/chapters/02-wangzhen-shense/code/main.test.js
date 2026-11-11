'use strict';

const assert = require('node:assert');
const test = require('node:test');
const { shape, shenTypes, fiveColors, fingerprint, excretions, SHEN, COLORS } = require('./main.js');

test('望诊规模：4 节 / 11 小节 / 24 段 / 2,812 字（全书 12.7%）', () => {
  const s = shape();
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.subs, 11);
  assert.strictEqual(s.paras, 24);
  assert.strictEqual(s.chars, 2812);
  assert.ok(Math.abs(s.share - 2812 / 22215) < 1e-9);
});

test('舌诊一节 1,249 字 = 望诊 44.4%（比全身+局部之和还多）', () => {
  const s = shape();
  const by = Object.fromEntries(s.sections.map((x) => [x.no, x]));
  assert.strictEqual(by['2.3'].chars, 1249);
  assert.strictEqual(by['2.1'].chars + by['2.2'].chars, 1168);
  assert.ok(by['2.3'].chars > by['2.1'].chars + by['2.2'].chars);
  assert.ok(Math.abs(by['2.3'].chars / 2812 - 0.444) < 0.001);
});

test('四节字数之和 = 2,812（不重不漏）', () => {
  const s = shape();
  assert.strictEqual(s.sections.reduce((n, x) => n + x.chars, 0), 2812);
});

test('望神 5 态全部命中原文', () => {
  const s = shenTypes();
  assert.strictEqual(SHEN.length, 5);
  assert.ok(s.every((x) => x.inText), '5 态应全部命中');
  assert.deepStrictEqual(s.map((x) => x.word), ['得神', '少神', '失神', '假神', '神乱']);
});

test('五色主病：标题写全五色，5 色齐', () => {
  const c = fiveColors();
  assert.strictEqual(c.titled, true);
  assert.ok(c.colors.every((x) => x.inText));
  assert.deepStrictEqual(COLORS, ['青', '赤', '黄', '白', '黑']);
});

test('小儿指纹：三关 3/3 + 四项观察 4/4', () => {
  const f = fingerprint();
  assert.strictEqual(f.gates.length, 3);
  assert.strictEqual(f.obs.length, 4);
  assert.ok(f.gates.every((x) => x.inText));
  assert.ok(f.obs.every((x) => x.inText));
});

test('望排出物是段标题层（2 条），扫小节层会得到 0', () => {
  const ex = excretions();
  assert.strictEqual(ex.length, 2);
  assert.ok(ex.some((t) => t.includes('痰涎')));
  assert.ok(ex.some((t) => t.includes('大便')));
});
