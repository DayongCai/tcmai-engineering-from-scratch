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
  assert.ok(DOC.endsWith(path.join('chapters', '04-j4', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE), '正文首行与章题不一致');
});

test('管道七级单向，从源层到交付层不多不少', () => {
  assert.strictEqual(A.pipeline.length, 7);
  assert.strictEqual(A.pipeline[0], '源层');
  assert.strictEqual(A.pipeline[6], '交付层');
  assert.deepStrictEqual(A.pipeline.slice(1, 3), ['单元层', '骨架层']);
});

test('六类边就是这几类，一类不多', () => {
  assert.deepStrictEqual(A.edgeTypes, ['nourish', 'spine', 'leaf', 'ref', 'derives_from', 'dsu']);
});

test('四类源与五类自检断言都数得出来', () => {
  assert.strictEqual(A.sources.length, 4);
  assert.strictEqual(A.asserts.length, 5);
  assert.ok(A.asserts.includes('树导航') && A.asserts.includes('接口路由'), A.asserts.join('/'));
});

test('检索栈用融合而非择一，RRF 参数与装配步数可复算', () => {
  assert.strictEqual(A.rrfK, 60);
  assert.ok(/RRF/.test(A.stackTail), A.stackTail);
  assert.strictEqual(A.asmSteps, 4);
});

test('schema 必填字段五项，缺一项就拦在建阶段', () => {
  assert.deepStrictEqual(A.nodeFields, ['id', 'level', 'level_index', 'name', 'kind']);
});

test('三条工程纪律与一处技术债都写在正文里', () => {
  assert.strictEqual(A.noHandEdit, true);
  assert.strictEqual(A.warnNotBreak, true);
  assert.strictEqual(A.viewWriteback, true);
  assert.strictEqual(A.neighborsFullTodo, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不含临床判断/);
  assert.ok(out.includes('RRF 参数 k = ' + A.rrfK), '输出里的 k 与现算不一致');
});
