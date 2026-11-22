'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, sweep } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 8);
  assert.match(d.title, /知识不是特征/);
  assert.ok(d.sections.length >= 5);
  assert.ok(d.hanzi > 2000);
});

test('λ 扫描表四行齐全，数值与正文一致', () => {
  const rows = sweep(doc());
  assert.strictEqual(rows.length, 4);
  assert.deepStrictEqual(rows.map((r) => r.lambda), [0, 0.1, 0.3, 1.0]);
  assert.deepStrictEqual(rows.map((r) => r.covered), [0.61, 0.66, 0.71, 0.68]);
  assert.deepStrictEqual(rows.map((r) => r.uncovered), [0.55, 0.55, 0.47, 0.33]);
});

test('最优 λ 由覆盖类 F1 现算，收益与损失对称可见', () => {
  const a = analyze(doc());
  assert.strictEqual(a.best.lambda, 0.3);
  assert.ok(Math.abs(a.coveredGain - 0.1) < 1e-9);
  assert.ok(Math.abs(a.uncoveredLoss - 0.08) < 1e-9);
  assert.ok(a.coveredGain > 0 && a.uncoveredLoss > 0);
});

test('违反率随先验强度单调下降', () => {
  const a = analyze(doc());
  assert.strictEqual(a.violationMonotone, true);
  assert.ok(Math.abs(a.violationDrop - 15.3) < 1e-9);
});

test('知识半径的覆盖率由覆盖/未覆盖类数现算', () => {
  const a = analyze(doc());
  assert.strictEqual(a.coveredClasses, 12);
  assert.strictEqual(a.uncoveredClasses, 40);
  assert.strictEqual(a.total, 52);
  assert.ok(a.coverageShare < 0.25, '半径应只罩住少数类别');
});

test('改正文的覆盖类数，覆盖率随之变化（证明确实现算）', () => {
  const mutated = text().replace('覆盖的 12 类上是 0.71', '覆盖的 26 类上是 0.71');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.strictEqual(a.coveredClasses, 26);
  assert.ok(Math.abs(a.coverageShare - 26 / 66) < 1e-9);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /先验强度扫描/);
  assert.match(out, /图谱覆盖/);
  assert.match(out, /不构成辨证标准或诊疗建议/);
});
