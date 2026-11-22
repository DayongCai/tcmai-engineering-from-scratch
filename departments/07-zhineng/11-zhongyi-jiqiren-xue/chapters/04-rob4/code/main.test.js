'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, arc, frictionBudget, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const X = analyze(read());

test('正文就在本章目录下，首行章题与章节元数据一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-rob4', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.ok(read().startsWith('# 第 4 章 · ' + TITLE), '正文首行与章题不一致');
  assert.strictEqual(X.hasTitle, true);
});

test('切向预算：μF_n = 0.4 × 20 = 8 N，a_t = 8 / 2 = 4 m/s²', () => {
  assert.strictEqual(X.mu, 0.4);
  assert.strictEqual(X.fn, 20);
  assert.strictEqual(X.m, 2);
  assert.strictEqual(X.ftMax, 8);
  assert.strictEqual(X.atMax, 4);
  const b = frictionBudget(0.4, 20, 2);
  assert.deepStrictEqual(b, { ftMax: 8, atMax: 4 });
});

test('最不利 μ = 0.15 时余量只剩 3 N，为设计留出的余量对得上正文', () => {
  assert.strictEqual(X.muAlt, 0.15);
  assert.ok(Math.abs(X.ftMaxAlt - 3) < 1e-9, `最不利切向余量 ${X.ftMaxAlt}`);
  assert.ok(X.ftMaxAlt < X.ftMax / 2, '最不利 μ 下余量应不到标称的一半');
  assert.ok(read().includes('只剩 3 N'), '正文应写明只剩 3 N');
});

test('曲率表逐行读出，ω = v/R、a_n = v²/R 与表内一致', () => {
  assert.strictEqual(X.v, 0.1);
  assert.strictEqual(X.curve.length, 4);
  assert.deepStrictEqual(X.curve.map((c) => c.radius), [0.15, 0.05, 0.02, 0.005]);
  assert.deepStrictEqual(X.curve.map((c) => c.doc.omega), [0.67, 2, 5, 20]);
  assert.deepStrictEqual(X.curve.map((c) => c.doc.normalAccel), [0.067, 0.2, 0.5, 2]);
  for (const c of X.curve) {
    assert.ok(c.omegaResidual < 0.005, `R=${c.radius} 角速度偏差 ${c.omegaResidual}`);
    assert.ok(c.accelResidual < 0.001, `R=${c.radius} 法向加速度偏差 ${c.accelResidual}`);
  }
});

test('曲率半径缩 30 倍，角速度涨 30 倍：带宽而非精度', () => {
  const first = X.curve[0];
  const last = X.curve[X.curve.length - 1];
  assert.strictEqual(first.radius / last.radius, 30);
  assert.ok(Math.abs(last.model.omega / first.model.omega - 30) < 1e-9);
  assert.ok(last.model.omega >= 20, '最小半径档应达到 20 rad/s 量级');
  const a = arc(0.1, 0.02);
  assert.strictEqual(a.omega, 5);
  assert.ok(Math.abs(a.normalAccel - 0.5) < 1e-12);
});

test('三层架构三层，安全层不可学习、规则层不可自学', () => {
  assert.strictEqual(X.layers.length, 3);
  assert.deepStrictEqual(X.layers.map((l) => l.name), ['安全层', '规则层', '优化层']);
  assert.match(X.layers[0].learnable, /不可/);
  assert.match(X.layers[1].learnable, /不可自学/);
  assert.match(X.layers[2].learnable, /可学习/);
});

test('规划器三个失效场景都在正文里', () => {
  assert.strictEqual(X.failures, 3);
  assert.ok(read().includes('奇异位形'));
  assert.ok(read().includes('明确失败'));
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成设备设计规范或临床操作规范/);
  assert.ok(out.includes('8.0 N'));
  assert.ok(out.includes('4.0 m/s²'));
  assert.ok(!out.includes('**'), '输出不应残留 Markdown 粗体标记');
});
