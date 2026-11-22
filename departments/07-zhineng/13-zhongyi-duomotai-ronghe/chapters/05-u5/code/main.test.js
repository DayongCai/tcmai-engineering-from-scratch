'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, encoderBudget } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 5);
  assert.match(d.title, /学到的表征/);
  assert.ok(d.sections.length >= 5);
  assert.ok(d.hanzi > 2000);
});

test('参数分项齐全且合计可复算', () => {
  const b = encoderBudget(doc());
  assert.strictEqual(b.parts.length, 5);
  assert.ok(Math.abs(b.totalM - 2.4) < 1e-9, `合计异常：${b.totalM}`);
  const manual = b.parts.reduce((a, p) => a + p.m, 0);
  assert.ok(Math.abs(b.totalM - manual) < 1e-12);
});

test('参数与样本比约 8,000 : 1', () => {
  const a = analyze(doc());
  assert.strictEqual(a.samples, 300);
  assert.ok(Math.abs(a.ratio - 8000) < 1, `比值异常：${a.ratio}`);
  assert.ok(a.ratio > 1000, '应远大于常规监督学习比例');
});

test('训练与留出、记录切分与患者切分的落差都可复算', () => {
  const a = analyze(doc());
  assert.ok(Math.abs(a.overfitGap - 0.25) < 1e-9);
  assert.ok(Math.abs(a.splitGap - 0.13) < 1e-9);
  assert.ok(a.recordSplit > a.patientSplit);
  assert.ok(a.trainAuroc > a.holdoutAuroc);
});

test('改正文的参数量，比例随之变化（证明确实现算）', () => {
  const mutated = text().replace('图像编码器 1.2 M', '图像编码器 6.2 M');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.ok(Math.abs(a.budget.totalM - 7.4) < 1e-9);
  assert.ok(Math.abs(a.ratio - 24666.666666) < 1);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /参数与样本比/);
  assert.match(out, /全部来自记住了人/);
  assert.match(out, /不构成诊断模型的设计规范或性能承诺/);
});
