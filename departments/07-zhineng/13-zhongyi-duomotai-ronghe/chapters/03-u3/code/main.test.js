'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 3);
  assert.match(d.title, /预处理不是洗干净/);
  assert.ok(d.sections.length >= 5);
  assert.ok(d.tables.length >= 2);
  assert.ok(d.hanzi > 2000);
});

test('滤波带宽与采样周期取自正文', () => {
  const a = analyze(doc());
  assert.deepStrictEqual(a.band, [0.5, 15]);
  assert.strictEqual(a.rate, 200);
  assert.strictEqual(a.periodMs, 5);
  assert.ok(Math.abs(a.bandShare - 0.15) < 1e-9);
});

test('抗混叠截止频率可由奈奎斯特与百分比复算', () => {
  const a = analyze(doc());
  assert.strictEqual(a.toHz, 100);
  assert.strictEqual(a.nyquist, 50);
  assert.strictEqual(a.pct, 80);
  assert.strictEqual(a.cutoffComputed, 40);
  assert.strictEqual(a.cutoffComputed, a.cutoffStated);
});

test('设备差与判读界的倍数关系成立', () => {
  const a = analyze(doc());
  assert.strictEqual(a.colorGap, 4.2);
  assert.strictEqual(a.colorEdge, 3.0);
  assert.ok(a.colorRatio > 1, '设备差应大于判读界');
  assert.ok(Math.abs(a.colorRatio - 1.4) < 1e-9);
});

test('改正文的降采样目标率，截止频率随之变化（证明确实现算）', () => {
  const mutated = text().replace('降到 100 Hz', '降到 200 Hz');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.strictEqual(a.toHz, 200);
  assert.strictEqual(a.cutoffComputed, 80);
  assert.notStrictEqual(a.cutoffComputed, a.cutoffStated, '正文此处未同步，正说明两个数各自现算');
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /带通保留/);
  assert.match(out, /设备噪声是判读界的/);
  assert.match(out, /不构成临床判读标准/);
});
