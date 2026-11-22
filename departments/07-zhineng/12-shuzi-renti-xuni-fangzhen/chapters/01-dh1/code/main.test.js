'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, settings, layers, compute, checks, CHAPTER } = require('./main.js');

test('正文存在，且读得出矩阵与体素字节数', () => {
  const text = readDoc();
  assert.ok(text.length > 2500, '正文过短，是否指错了文件');
  const s = settings(text);
  assert.deepStrictEqual([s.cols, s.rows, s.slices], [512, 512, 500]);
  assert.strictEqual(s.bytesPerVoxel, 2);
  assert.strictEqual(s.inplaneMm, 0.5);
});

test('体素数与存贮量按矩阵现算，不写死', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.voxels, 512 * 512 * 500);
  assert.strictEqual(c.bytes, c.voxels * 2);
  assert.ok(Math.abs(c.mib - 250) < 1, `MiB 口径应约 250，实得 ${c.mib}`);
});

test('重采样倍数等于层厚与层内像素之比的立方', () => {
  const c = compute(readDoc());
  assert.strictEqual(c.factor, 8);
  assert.strictEqual(c.bytesFine, c.bytes * 8);
  assert.ok(c.bytesFine / 1e9 > 1.8 && c.bytesFine / 1e9 < 2.4, '加密后应在 2 GB 量级');
});

test('分层交付表能逐行读出，且尺度单调收紧', () => {
  const L = layers(readDoc());
  assert.strictEqual(L.length, 3);
  assert.strictEqual(L[0].name, '全身');
  assert.ok(L[0].maxMm > L[1].maxMm, '全身尺度应大于器官');
  assert.ok(L[2].minMm <= 0.1, '局部层应到 0.1 mm 及以下');
});

test('五条对照全部通过', () => {
  const bad = checks(readDoc()).filter((k) => !k.ok);
  assert.deepStrictEqual(bad.map((k) => k.name), [], '有对照未通过：' + bad.map((k) => k.note).join('；'));
});

test('脚本可运行，输出含复算与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 300, '输出过短');
  assert.match(out, /体素数\s+131,072,000/);
  assert.match(out, /教学样例：数字按正文给出的矩阵与层厚现算/);
  assert.match(out, /不构成医学意见或诊断依据/);
  assert.doesNotMatch(out, /三辨|四位面|单元规模|本课第/);
});

test('章号与正文标题里的章号一致', () => {
  const first = readDoc().split('\n')[0];
  assert.ok(first.startsWith(`# 第 ${CHAPTER} 章`), '标题章号对不上：' + first);
});
