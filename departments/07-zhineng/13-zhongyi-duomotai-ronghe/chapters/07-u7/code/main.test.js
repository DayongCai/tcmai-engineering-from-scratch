'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, methodRows } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 7);
  assert.match(d.title, /聚类出来的亚型/);
  assert.ok(d.sections.length >= 5);
  assert.ok(d.hanzi > 2000);
});

test('四种方法的 ARI 与 κ 都从表格读出', () => {
  const rows = methodRows(doc());
  assert.strictEqual(rows.length, 4);
  assert.deepStrictEqual(rows.map((r) => r.ari), [0.28, 0.35, 0.47, 0.52]);
  assert.deepStrictEqual(rows.map((r) => r.kappa), [0.21, 0.29, 0.38, 0.44]);
  assert.ok(rows.every((r) => r.sizes.length === 3));
});

test('类别规模极差由三次运行的规模现算', () => {
  const rows = methodRows(doc());
  assert.ok(Math.abs(rows[0].spread - 62 / 31) < 1e-9);
  assert.ok(Math.abs(rows[3].spread - 61 / 59) < 1e-9);
  assert.ok(rows[0].spread > rows[3].spread, '加约束后规模应更均衡');
});

test('稳定阈值取自正文，通过数由阈值判定', () => {
  const a = analyze(doc());
  assert.strictEqual(a.unstable, 0.5);
  assert.strictEqual(a.unusable, 0.3);
  assert.strictEqual(a.pass, 1);
  assert.strictEqual(a.fail, 1, '0.28 落在不可用区');
  assert.ok(Math.abs(a.lift - 0.24) < 1e-9);
  assert.match(a.bestMethod, /理论轴投影/);
});

test('改正文的稳定阈值，通过数随之变化（证明确实现算）', () => {
  const mutated = text().replace('ARI 中位数 < 0.5 视为不稳定', 'ARI 中位数 < 0.3 视为不稳定');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.strictEqual(a.unstable, 0.3);
  assert.strictEqual(a.pass, 3);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /方法对比/);
  assert.match(out, /最优方法/);
  assert.match(out, /不构成证候分类标准/);
});
