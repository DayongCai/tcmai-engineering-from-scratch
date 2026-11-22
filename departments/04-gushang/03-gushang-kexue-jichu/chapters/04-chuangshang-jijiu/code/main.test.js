'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, ABCDE, COMPLICATIONS, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-chuangshang-jijiu', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '急救的第一个动作不是接骨');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2783);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.citeCount, 2);
});

test('现场评估按 ABCDE 排，五项齐全且次序递增', () => {
  assert.deepStrictEqual(A.abcdeMissing, []);
  assert.strictEqual(A.abcde.length, ABCDE.length);
  assert.ok(A.abcdeOrdered, JSON.stringify(A.abcde));
  assert.strictEqual(A.abcde[0].key, '气道');
  assert.strictEqual(A.abcde[4].key, '暴露与环境');
});

test('两套三件事齐全：止血带与开放伤', () => {
  assert.strictEqual(A.tourniquet.length, 3, A.tourniquet.join('、'));
  assert.strictEqual(A.open.length, 3, A.open.join('、'));
  assert.ok(A.notProbe && A.notPushBack && A.notPull, '正文缺某个「不」');
});

test('五个致命并发症在正文里都能找到', () => {
  assert.deepStrictEqual(A.complications, COMPLICATIONS);
});

test('次序判据写着：先评估后固定、先固定后搬运、第一步不碰病人', () => {
  assert.ok(A.firstIsNotBone, '缺「急救的第一步永远不是碰病人」');
  assert.ok(A.checkBeforeFix, '缺「先评估神经血管，后固定」');
  assert.ok(A.fixBeforeCarry, '缺「先固定，后搬运」');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /院前急救规范/);
  assert.ok(out.includes('汉字 2783 字'));
  assert.ok(out.includes('次序成立'));
});
