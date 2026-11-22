'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, designEffect, ppv, npv, mcnemar } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '10-m10', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 10);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('按段划分的泄漏：1 − 0.2⁵ ＝ 0.9997', () => {
  assert.strictEqual(A.leak.toFixed(4), '0.9997');
  assert.match(TEXT, /1 − 0\.2⁵ = 0\.9997/);
  assert.match(TEXT, /只对应 500 个人/);
});

test('设计效应表四行：3.4 / 4.2 / 9.1 / 1.0，有效 n 与表内一致', () => {
  assert.strictEqual(A.nominal, 2500);
  const rows = A.designs.filter((d) => Number.isFinite(d.rho));
  for (const d of rows) {
    const de = designEffect(d.m, d.rho);
    assert.ok(Math.abs(de - d.statedDe) < 0.06, `m=${d.m} ρ=${d.rho}: ${de} vs ${d.statedDe}`);
    assert.strictEqual(Math.round(A.nominal / de), d.statedN, `有效 n @ m=${d.m}`);
  }
  const solo = A.designs.find((d) => d.m === 1);
  assert.ok(solo, '缺少「一人一段」那一行');
  assert.strictEqual(designEffect(1, 0.9), 1);
  assert.strictEqual(designEffect(5, 0.6).toFixed(1), '3.4');
  assert.strictEqual(Math.sqrt(designEffect(5, 0.6)).toFixed(2), '1.84');
});

test('PPV 与 NPV 随患病率重算，与表内四行逐格一致', () => {
  assert.strictEqual(A.se, 0.85);
  assert.strictEqual(A.sp, 0.9);
  for (const p of A.prevs) {
    assert.ok(Math.abs(ppv(A.se, A.sp, p.prev) - p.statedPPV) < 0.002, `PPV @ ${p.prev}`);
    assert.ok(Math.abs(npv(A.se, A.sp, p.prev) - p.statedNPV) < 0.002, `NPV @ ${p.prev}`);
  }
  assert.strictEqual(ppv(0.85, 0.9, 0.05).toFixed(3), '0.309');
  assert.strictEqual(ppv(0.85, 0.9, 0.5).toFixed(3), '0.895');
  assert.ok(ppv(0.85, 0.9, 0.05) < npv(0.85, 0.9, 0.05), '低患病率下 PPV 应远低于 NPV');
  assert.throws(() => ppv(0, 1, 0.5), '没有阳性判定时 PPV 未定义');
});

test('McNemar 双侧精确 p 与表内四行一致，12:3 才显著', () => {
  const got = A.mc.map((m) => mcnemar(m.b, m.c));
  assert.deepStrictEqual(got.map((p) => p.toFixed(3)), ['0.219', '0.375', '0.065', '0.035']);
  for (let i = 0; i < A.mc.length; i += 1) assert.ok(Math.abs(got[i] - A.mc[i].stated) < 0.002);
  assert.ok(mcnemar(12, 3) < 0.05 && mcnemar(5, 1) > 0.05);
  assert.strictEqual(mcnemar(0, 0), 1);
  assert.throws(() => mcnemar(-1, 3));
});

test('正文把演算设定与实测分开：不报实测性能与样本量', () => {
  assert.match(TEXT, /不给出任何实测的准确率、敏感度、AUC、样本量与 p 值/);
  assert.match(TEXT, /噪声实验为 120 次重复的均值/);
  assert.match(TEXT, /0\.886/);
  assert.match(TEXT, /0\.495/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /演算设定/);
  assert.ok(out.includes('1 − 0.2^5 ＝ 0.9997'), '输出里的泄漏比例与正文的 0.9997 不一致');
  assert.ok(out.includes('12 : 3 → 0.035'), '输出里的 McNemar p 与正文的 0.035 不一致');
  assert.ok(out.includes('PPV 0.309'), '输出里的 PPV 与正文的 0.309 不一致');
});
