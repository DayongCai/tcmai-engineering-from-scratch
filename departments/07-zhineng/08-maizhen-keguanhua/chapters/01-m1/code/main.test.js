'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, tables, rateMargin } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与标题与正文首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-m1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '脉象采集：机器接得住波形，接不住「按到什么程度」');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
  assert.ok(read().includes(TITLE), '章题与正文标题不一致');
});

test('采集网格由正文维度表现算：2 × 3 × 3 × 2 ＝ 36', () => {
  assert.deepStrictEqual(A.dims, [2, 3, 3, 2], '维度表取值个数变了');
  assert.strictEqual(A.grid, 36);
  assert.ok(TEXT.includes('36 个格'), '正文应写明 36 个格');
});

test('单侧位点数是部 × 候 ＝ 9，与正文「9 个取脉位点」一致', () => {
  assert.strictEqual(A.perSide, 9);
  assert.ok(/9\s*个取脉位点/.test(TEXT), '正文应写明 9 个取脉位点');
  assert.ok(A.grid === A.perSide * 2 * 2, '网格应等于单侧位点 × 手 2 × 手法 2');
});

test('四个通道各有各的盲区，PPG 一路的盲区是「施加压力」', () => {
  assert.strictEqual(A.channels.length, 4);
  const ppg = A.channels.find((r) => r.join('').includes('PPG'));
  assert.ok(ppg, '通道表里应有 PPG 一行');
  const blind = ppg[ppg.length - 1];
  assert.ok(blind.includes('施加压力'), 'PPG 的「测不到」应写明施加压力：' + blind);
  assert.ok(blind.includes('脉位'), 'PPG 的盲区还应点到脉位：' + blind);
});

test('装置四类、质控四条、协议字段七类，都从表与编号列数出来', () => {
  assert.strictEqual(A.devices, 4);
  assert.strictEqual(A.qc, 4, '四、节应有 4 条编号判据');
  assert.strictEqual(A.fields, 7, '五、节协议表应有 7 类字段');
  assert.strictEqual(A.tables, 4);
});

test('采样率与主能量频带：100 至 250 Hz 对 10 Hz 以内，余量 10 至 25 倍', () => {
  assert.deepStrictEqual(A.rate, { min: 100, max: 250 });
  assert.strictEqual(A.band, 10);
  const m = rateMargin(A.rate, A.band);
  assert.deepStrictEqual(m, { low: 10, high: 25 });
  assert.ok(TEXT.includes('100 至 250 Hz'), '正文应写明采样率量级');
});

test('正文不出现实测灵敏度、合格率与样本量，只留边界声明', () => {
  assert.ok(!/灵敏度\s*[为是]?\s*0\.\d+/.test(TEXT), '正文不应给实测灵敏度');
  assert.match(TEXT, /不引用任何实测灵敏度/);
  assert.match(TEXT, /不构成标准条文/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不引用任何实测灵敏度/);
  assert.ok(out.includes('＝ 36 个格'), '输出里的网格数与正文的 36 不一致');
  assert.ok(out.includes('质控判据 4 条'), '输出里的质控条数与正文的 4 条不一致');
});
