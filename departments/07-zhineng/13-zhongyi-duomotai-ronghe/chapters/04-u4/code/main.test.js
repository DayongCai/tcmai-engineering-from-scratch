'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, compression } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 4);
  assert.match(d.title, /特征是压缩/);
  assert.ok(d.sections.length >= 5);
  assert.ok(d.hanzi > 2000);
});

test('三路压缩比由原始规模与维数现算', () => {
  const rows = compression(doc().problem);
  assert.strictEqual(rows.length, 3);
  const by = Object.fromEntries(rows.map((r) => [r.name, r]));
  assert.strictEqual(by['舌象'].raw, 12000000);
  assert.strictEqual(by['舌象'].dims, 30);
  assert.strictEqual(by['舌象'].ratio, 400000);
  assert.strictEqual(by['脉图'].ratio, 500);
  assert.strictEqual(by['语音'].ratio, 24000);
  assert.ok(by['舌象'].ratio > by['语音'].ratio && by['语音'].ratio > by['脉图'].ratio);
});

test('n ≥ 10p 的维数上限与正文标注一致', () => {
  const a = analyze(doc());
  assert.strictEqual(a.perFeature, 10);
  assert.strictEqual(a.samples, 300);
  assert.strictEqual(a.limit, 30);
  assert.strictEqual(a.limit, a.limitStated);
});

test('拼接维数超出上限，需要更多样本', () => {
  const a = analyze(doc());
  assert.strictEqual(a.each, 20);
  assert.strictEqual(a.total, 80);
  assert.ok(a.overFactor > 2 && a.overFactor < 3, `倍数异常：${a.overFactor}`);
  assert.strictEqual(a.neededSamples, 800);
  assert.ok(a.neededSamples > a.samples);
});

test('改正文的维数，压缩比随之变化（证明确实现算）', () => {
  const mutated = text().replace('压成 30 维手工特征', '压成 60 维手工特征');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const rows = compression(parseDoc(mutated).problem);
  const tongue = rows.find((r) => r.name === '舌象');
  assert.strictEqual(tongue.dims, 60);
  assert.strictEqual(tongue.ratio, 200000);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /压缩比/);
  assert.match(out, /样本量规则/);
  assert.match(out, /不构成诊断依据/);
});
