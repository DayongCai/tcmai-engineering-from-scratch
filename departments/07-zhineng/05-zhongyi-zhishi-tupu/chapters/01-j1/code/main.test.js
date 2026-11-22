'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const A = analyze(read());

test('正文就在本章目录下，章号与标题与正文首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-j1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 1);
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE), '正文首行与章题不一致');
});

test('五级编码表逐行读出：须根干枝叶 + 概念丛', () => {
  assert.strictEqual(A.levels.length, 6);
  assert.strictEqual(A.lCount, 5);
  assert.deepStrictEqual(A.levels.map((x) => x.level), ['L0', 'L1', 'L2', 'L3', 'L4', '—']);
  assert.deepStrictEqual(A.levels.slice(0, 4).map((x) => x.count), [6, 4, 8, 120]);
});

test('叶数 = 章节叶 + 病证叶，表内数字与两分项自洽', () => {
  assert.strictEqual(A.chapterLeaves, 2489);
  assert.strictEqual(A.dsuLeaves, 103);
  assert.strictEqual(A.leafSum, A.leafCount);
  assert.strictEqual(A.leafCount, 2592);
});

test('树边按 n−1 推出，比叶数少一条', () => {
  assert.strictEqual(A.treeEdges, A.leafCount - 1);
  assert.strictEqual(A.treeEdges, 2591);
});

test('归并率由教材单元数与叶数现算，落在正文所说三成以上', () => {
  assert.strictEqual(A.units, 18065);
  assert.ok(A.mergeRatio > 0.3, `归并率过低：${A.mergeRatio}`);
  assert.ok(Math.abs(A.mergeRatio - 0.857) < 0.001, `归并率 ${A.mergeRatio}`);
});

test('两层性质对照表与概念丛门槛都在正文里', () => {
  assert.strictEqual(A.twoRows, 5);
  assert.strictEqual(A.cluster, 333);
  assert.strictEqual(A.clusterGate, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊断或辨证依据/);
  assert.ok(out.includes('章节叶 ' + A.chapterLeaves), '输出里的分项与现算不一致');
});
