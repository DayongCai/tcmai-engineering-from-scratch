'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, leafCap, leafInterval } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-m5', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.ok(TEXT.startsWith('# 第 ' + CHAPTER + ' 章'));
  assert.ok(TEXT.includes(TITLE));
});

test('三套体系的脉数从表格现读：24 / 27 / 28', () => {
  assert.deepStrictEqual(A.systems.map((s) => s.count), [24, 27, 28]);
  assert.ok(A.systems[0].name.includes('脉经'));
  assert.match(TEXT, /二十四脉/);
  assert.match(TEXT, /二十八脉/);
});

test('叶子数上限就是 2^d，与正文的四档逐个对上', () => {
  assert.deepStrictEqual(A.depths.map((r) => r.d), [2, 3, 5, 7]);
  for (const row of A.depths) assert.strictEqual(leafCap(row.d), row.cap, `深度 ${row.d}`);
  assert.strictEqual(A.readLevels, 4);
});

test('要素五维：位、数、形、势、节律', () => {
  assert.strictEqual(A.elements, 5);
  for (const k of ['位', '数', '形', '势', '节律']) assert.ok(TEXT.includes(k));
});

test('叶子上 12/15 的区间：标准误 0.103，±0.20', () => {
  const L = A.leaf;
  assert.strictEqual(L.k, 12);
  assert.strictEqual(L.n, 15);
  assert.ok(Math.abs(L.p - 0.8) < 1e-12);
  assert.strictEqual(L.se.toFixed(3), '0.103');
  assert.strictEqual(L.half.toFixed(2), '0.20');
  assert.match(TEXT, /标准误 0\.103，乘 1\.96 得 ±0\.20/);
});

test('叶子区间对越界计数报错，不静默返回', () => {
  assert.throws(() => leafInterval(16, 15));
  assert.throws(() => leafInterval(3, 0));
  assert.throws(() => leafInterval(1.5, 15));
  assert.strictEqual(leafInterval(15, 15).half, 0);
});

test('正文不给性能与样本分布数字，只给结构与经验判断', () => {
  assert.match(TEXT, /不给出任何模型的准确率、样本量与类别分布/);
  assert.match(TEXT, /经验判断，不是标准/);
  assert.ok(!/准确率\s*[0-9.]+%/.test(TEXT), '正文不应出现准确率');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不得作为诊断依据直接使用/);
  assert.ok(out.includes('后世通行：28 脉'), '输出里的脉数与正文不一致');
  assert.ok(out.includes('±0.20'), '输出里的区间与正文的 ±0.20 不一致');
  assert.match(out, /深度  7  叶子 ≤ 128（一致）/);
});
