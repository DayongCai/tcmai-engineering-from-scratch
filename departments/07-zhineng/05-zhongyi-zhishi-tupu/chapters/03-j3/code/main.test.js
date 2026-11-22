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
  assert.ok(DOC.endsWith(path.join('chapters', '03-j3', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE), '正文首行与章题不一致');
});

test('五行：五节点、生五对、克五对，合计十条边', () => {
  assert.strictEqual(A.sheng.length, 5);
  assert.strictEqual(A.ke.length, 5);
  assert.strictEqual(A.wuxingEdges, 10);
  assert.ok(A.sheng.includes('木生火') && A.ke.includes('木克土'), '生克对读错了');
});

test('乘侮若各建一类边，边数按有序对与两式算出，恰好是正文所说的数十条', () => {
  assert.strictEqual(A.chengwuIfSeparate, 5 * 4 * 2);
  assert.strictEqual(A.chengwuIfSeparate, 40);
  assert.ok(A.chengwuIfSeparate > A.wuxingEdges, '乘侮边数应远多于生克边数');
});

test('十二经流注链十二个节点且闭环，表里对数正好是一半', () => {
  assert.strictEqual(A.chain.length, 12);
  assert.strictEqual(A.chain[0], '手太阴肺经');
  assert.strictEqual(A.chain[11], '足厥阴肝经');
  assert.strictEqual(A.chainClosed, true);
  const liuzhu = A.meridianTypes.find((x) => x.type === 'meridian_liuzhu');
  const biaoli = A.meridianTypes.find((x) => x.type === 'meridian_biaoli');
  assert.strictEqual(liuzhu.count, A.chain.length);
  assert.strictEqual(biaoli.count, liuzhu.count / 2);
});

test('六经六值、证据等级六级，等级决定用途写在正文里', () => {
  assert.strictEqual(A.sixMeridians.length, 6);
  assert.deepStrictEqual(A.evidence, ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.strictEqual(A.evidenceDecidesUse, true);
});

test('病证单元四个侧面齐全，两套资料重叠 13/104', () => {
  assert.deepStrictEqual(A.sides, ['病侧', '证侧', '中缝', '树位']);
  assert.strictEqual(A.overlapHit.same, 13);
  assert.strictEqual(A.overlapHit.total, 104);
  assert.ok(A.overlapHit.same < A.overlapHit.total, '重叠数应小于总数');
});

test('编码不可猜：正文写明离线时标「未能核实」', () => {
  assert.strictEqual(A.noCodeGuess, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊断或用药建议/);
  assert.ok(out.includes('生 ' + A.sheng.length + ' 对'), '输出里的生克对数与现算不一致');
});
