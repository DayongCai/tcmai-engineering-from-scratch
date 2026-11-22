'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, convParams, receptiveField, pAllInTrain, design } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-m6', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('逐层参数量用 输入×输出×核长＋输出 重算，与正文表格逐行一致', () => {
  assert.deepStrictEqual(A.layers.map((L) => L.params), [160, 4640, 18496, 20544]);
  for (const L of A.layers) assert.strictEqual(L.params, L.stated, `${L.inC}→${L.outC} k=${L.k}`);
  assert.strictEqual(A.total, 43840);
  assert.strictEqual(convParams(1, 16, 9), 160);
  assert.strictEqual(convParams(64, 64, 5), 20544);
});

test('每段波形养活 43,840 ÷ 1,500 ≈ 29 个参数', () => {
  assert.strictEqual(A.segParam, 1500);
  assert.strictEqual(A.paramsPerSegment.toFixed(0), '29');
  assert.match(TEXT, /43,840 ÷ 1,500 ≈ 29/);
});

test('感受野 1 + Σ(k−1) ＝ 29 点，200 Hz 下 145 毫秒', () => {
  assert.strictEqual(A.rf, 29);
  assert.deepStrictEqual(A.layers.map((L) => L.k), [9, 9, 9, 5]);
  assert.strictEqual(receptiveField([9, 9, 9, 5]), 29);
  assert.strictEqual(((A.rf / A.rate) * 1000).toFixed(0), '145');
  assert.match(TEXT, /145 毫秒/);
});

test('心动周期 800 毫秒，感受野不到五分之一', () => {
  assert.strictEqual(A.bpm, 75);
  const beat = 60000 / A.bpm;
  assert.strictEqual(beat, 800);
  assert.ok((A.rf / A.rate) * 1000 / beat < 0.2, '145 毫秒应低于 800 毫秒的五分之一');
  assert.match(TEXT, /不到一个心动周期的五分之一/);
});

test('按段划分的泄漏：0.8⁸ ＝ 0.168，露脸 0.832', () => {
  assert.strictEqual(A.segPerPerson, 8);
  assert.strictEqual(A.pAll.toFixed(3), '0.168');
  assert.strictEqual(A.pLeak.toFixed(3), '0.832');
  assert.match(TEXT, /0\.8⁸ = 0\.168/);
  assert.strictEqual(pAllInTrain(1, 0.8), 0.8);
  assert.throws(() => pAllInTrain(8, 1));
});

test('设计效应 3.4、有效样本量 735、区间放大 1.84 倍', () => {
  const d = A.design;
  assert.strictEqual(d.m, 5);
  assert.strictEqual(d.rho, 0.6);
  assert.strictEqual(d.de.toFixed(1), '3.4');
  assert.strictEqual(A.nominal, 2500);
  assert.strictEqual(A.effective, 735);
  assert.strictEqual(d.inflation.toFixed(2), '1.84');
  assert.deepStrictEqual(design(1, 0.6).de, 1);
  assert.throws(() => design(5, 1.5));
});

test('正文标清演算设定，不引实测性能与数据集规模', () => {
  assert.match(TEXT, /演算设定/);
  assert.match(TEXT, /不引用任何模型的性能数字、数据集规模与设备型号/);
  assert.ok(!/AUC\s*[=＝]\s*0?\.\d+/.test(TEXT), '正文不应给 AUC 数值');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不来自任何实测模型或数据集/);
  assert.ok(out.includes('≈ 29'), '输出里的每段参数量应与正文的 29 一致');
  assert.ok(out.includes('≈ 735'), '输出里的有效样本量应与正文的 735 一致');
  assert.ok(out.includes('合计 43,840 个参数'));
});
