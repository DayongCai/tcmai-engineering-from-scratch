'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, burden, budget } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-m3', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('样本数与特征数从正文读出：120 例、480 个特征', () => {
  assert.strictEqual(A.n, 120);
  assert.strictEqual(A.features, 480);
  assert.match(TEXT, /480\s*个/);
});

test('特征 ∶ 样本 ＝ 4∶1，与正文的写法一致', () => {
  assert.strictEqual(A.burden.ratio, 4);
  assert.strictEqual(A.burden.ratio.toFixed(0), '4');
  assert.ok(TEXT.includes('4∶1'), '正文应写明 4∶1');
});

test('按每特征十个样本，120 例只支持 12 个特征', () => {
  assert.strictEqual(budget(120, 10), 12);
  assert.strictEqual(budget(120, 1), 120);
  assert.throws(() => budget(0, 10));
  assert.throws(() => burden(480, 0));
});

test('四个特征域、三层重测信度、五步流程纪律，都从正文数出来', () => {
  assert.strictEqual(A.domains, 4);
  assert.strictEqual(A.reliabilityLayers, 3);
  assert.strictEqual(A.steps, 5);
  assert.strictEqual(A.contexts, 3);
  assert.strictEqual(A.sections.length, 6);
});

test('正文把「重复采人」与「重复算数」明确分开', () => {
  assert.match(TEXT, /重复采人，而不是重复算数/);
  assert.match(TEXT, /恒等于 1/);
});

test('正文不给阈值与信度系数，只给边界', () => {
  assert.ok(!/ICC\s*[=＝]\s*0?\.\d+/.test(TEXT), '正文不应给 ICC 数值');
  assert.match(TEXT, /不给出任何特征的具体阈值或信度数值/);
  assert.match(TEXT, /工程经验上的量级建议/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /量级建议，不是标准/);
  assert.ok(out.includes('480 ∶ 120 ＝ 4∶1'), '输出里的比例与正文的 4∶1 不一致');
  assert.ok(out.includes('支持 12 个特征'), '输出里的特征预算与正文口径不一致');
});
