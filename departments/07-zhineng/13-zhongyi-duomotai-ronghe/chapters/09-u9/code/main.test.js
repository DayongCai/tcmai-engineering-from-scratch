'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, missingCurve, powerTable } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 9);
  assert.match(d.title, /说多模态更好之前/);
  assert.ok(d.sections.length >= 5);
  assert.ok(d.hanzi > 2000);
});

test('增益与置信区间取自正文，跨零判定由端点得出', () => {
  const a = analyze(doc());
  assert.strictEqual(a.full, 0.86);
  assert.strictEqual(a.single, 0.84);
  assert.ok(Math.abs(a.delta - 0.02) < 1e-9);
  assert.deepStrictEqual(a.ci, [-0.01, 0.05]);
  assert.strictEqual(a.spansZero, true);
  assert.strictEqual(a.n, 300);
});

test('缺失曲线四档齐全，交叉点由比较得出', () => {
  const curve = missingCurve(doc());
  assert.strictEqual(curve.length, 4);
  assert.deepStrictEqual(curve.map((r) => r.rate), [0, 10, 30, 50]);
  assert.strictEqual(curve[0].fusion > curve[0].tongue, true);
  const a = analyze(doc());
  assert.strictEqual(a.crossover, 30);
  assert.ok(curve[3].tongue > curve[3].fusion);
});

test('效能表三行，0.02 的差异在 300 例时 power 仅 0.12', () => {
  const powers = powerTable(doc());
  assert.strictEqual(powers.length, 3);
  assert.deepStrictEqual(powers.map((p) => p.delta), [0.1, 0.05, 0.02]);
  assert.deepStrictEqual(powers.map((p) => p.need), [120, 400, 2400]);
  const a = analyze(doc());
  assert.strictEqual(a.at300.power, 0.12);
  assert.strictEqual(a.underpowered, true);
});

test('改正文的样本量，效能结论随之变化（证明确实现算）', () => {
  const mutated = text().replace('n = 300，bootstrap', 'n = 3000，bootstrap');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.strictEqual(a.n, 3000);
  assert.strictEqual(a.underpowered, false);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /跨过零/);
  assert.match(out, /效能（300 例时）/);
  assert.match(out, /不构成临床效能结论或产品性能评价/);
});
