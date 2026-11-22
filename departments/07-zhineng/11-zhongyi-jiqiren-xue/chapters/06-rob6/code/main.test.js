'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, clockError, combine, kgfToNewton, analyze,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const BODY = read();
const X = analyze(BODY);

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-rob6', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.ok(BODY.startsWith('# 第 6 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('时钟偏差表逐行现算：Δx = v·Δt，v = 0.2 m/s', () => {
  assert.strictEqual(X.v, 0.2);
  assert.strictEqual(X.clock.length, 4);
  assert.deepStrictEqual(X.clock.map((c) => c.dtMs), [1, 10, 50, 200]);
  assert.deepStrictEqual(X.clock.map((c) => c.doc), [0.2, 2, 10, 40]);
  for (const c of X.clock) {
    assert.ok(c.residual < 1e-9, `Δt=${c.dtMs} 处 Δx=${c.model} vs ${c.doc}`);
  }
  assert.ok(Math.abs(clockError(0.2, 10) - 2) < 1e-9);
  assert.ok(Math.abs(clockError(0.2, 200) - 40) < 1e-9);
});

test('「毫秒级」有据：1 ms 只偏 0.2 mm，200 ms 偏到 40 mm', () => {
  const first = X.clock[0];
  const last = X.clock[X.clock.length - 1];
  assert.ok(first.model <= 0.2, '1 ms 偏差应小于重复定位误差');
  assert.ok(last.model >= 40, '200 ms 偏差应到危险量级');
  assert.ok(Math.abs(last.model / first.model - 200) < 1e-6, '偏差与位置误差成正比');
});

test('坐标链合成误差 √0.3025 ≈ 0.55 mm，与正文一致', () => {
  assert.deepStrictEqual(X.sigmas, [0.1, 0.05, 0.2, 0.5]);
  assert.ok(Math.abs(X.sigmaTotal - 0.55) < 0.006, `σ=${X.sigmaTotal}`);
  assert.strictEqual(X.sigmaTotal.toFixed(2), '0.55');
  assert.strictEqual(X.sigmaDoc, 0.55);
  assert.ok(Math.abs(combine([0.1, 0.05, 0.2, 0.5]) - X.sigmaTotal) < 1e-12);
  // 体表配准那一环最大，且合成值必然不小于它
  assert.strictEqual(Math.max(...X.sigmas), 0.5);
  assert.ok(X.sigmaTotal >= 0.5 && X.sigmaTotal < 0.5 + 0.1, '合成值应略大于最大的一环');
});

test('kgf/N：20 kgf = 196 N，量级错误能被范围检查抓住', () => {
  assert.strictEqual(X.rate, 9.8);
  assert.ok(Math.abs(X.converted - 196) < 1e-9);
  assert.ok(Math.abs(X.ratio - 9.8) < 1e-9);
  assert.strictEqual(kgfToNewton(20), 196);
  assert.ok(X.converted > 200 - 5, '196 N 已接近/越过人体接触的合理上限');
  assert.ok(BODY.includes('196 N'), '正文应写明 196 N');
});

test('四层架构的周期差一个数量级，实时层丢一拍是事故', () => {
  assert.strictEqual(X.layers.length, 4);
  assert.deepStrictEqual(X.layers.map((l) => l.name), ['实时层', '协调层', '应用层', '业务层']);
  assert.match(X.layers[0].period, /1 ms/);
  assert.match(X.layers[0].cost, /控制失稳/);
  assert.match(X.layers[3].cost, /不影响动作/);
});

test('坐标链四环，只有体表配准每次治疗都会失效', () => {
  assert.strictEqual(X.transforms.length, 4);
  assert.deepStrictEqual(X.transforms.map((t) => t.name), ['base→flange', 'flange→tool', 'tool→sensor', 'sensor→patient']);
  assert.match(X.transforms[3].expires, /病人移动/);
  assert.strictEqual(X.contracts.length, 4);
  assert.deepStrictEqual(X.contracts.map((c) => c.item), ['有效性', '时效', '方向', '退化']);
});

test('集成验收五项，含单位注入与断链测试', () => {
  assert.strictEqual(X.acceptance.length, 5);
  assert.ok(X.acceptance.some((a) => a.includes('单位')));
  assert.ok(X.acceptance.some((a) => a.includes('断链')));
  assert.ok(X.acceptance.some((a) => a.includes('故障注入')));
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成技术规范或验收标准/);
  assert.ok(out.includes('≈ 0.55 mm'));
  assert.ok(out.includes('196.0 N'));
});
