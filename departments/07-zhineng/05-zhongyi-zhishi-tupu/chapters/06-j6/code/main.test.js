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
  assert.ok(DOC.endsWith(path.join('chapters', '06-j6', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE), '正文首行与章题不一致');
});

test('三层表示齐全：字符串、结构化、向量各管一段', () => {
  assert.deepStrictEqual(A.layers, ['字符串', '结构化', '向量']);
});

test('字段完整度以证候条数为分母，主症只有六成有值', () => {
  assert.strictEqual(A.base, 97);
  assert.strictEqual(A.fields['证候'].value, 97);
  assert.strictEqual(A.fields['证候'].total, 97);
  assert.strictEqual(A.fields['主症'].value, 60);
  assert.strictEqual(Number((A.rate('主症') * 100).toFixed(1)), 61.9);
  assert.strictEqual(A.fields['病性'].value, 92);
  assert.strictEqual(A.fields['病位'].value, 80);
  assert.strictEqual(A.fields['动作'].value, 73);
});

test('恒为零的字段有四个，因此以六经为轴的统计做不出来', () => {
  assert.deepStrictEqual(A.zeroFields, ['dcat', 'dsym', 'six', 'formula']);
  assert.strictEqual(A.fields.six, undefined, 'six 在完整度块里没有取值');
});

test('索引文档数等于病证单元加其他概念，两套分词各建一张虚表', () => {
  assert.strictEqual(A.docCount, 117);
  assert.strictEqual(A.dsuDocs + A.otherDocs, A.docCount);
  assert.deepStrictEqual([A.dsuDocs, A.otherDocs], [104, 13]);
  assert.strictEqual(A.vocab, 34513);
  assert.strictEqual(A.ftsTables.length, 2);
  assert.deepStrictEqual(A.ftsTables, ['docs_terms', 'docs_substr']);
});

test('聚类纯度三个值可读，且补语境后下降', () => {
  assert.strictEqual(A.knnName, 0.221);
  assert.strictEqual(A.knnDisease, 0.667);
  assert.strictEqual(A.knnWithContext, 0.725);
  assert.ok(A.knnWithContext > A.knnDisease, '补语境后应低于只送证名描述');
});

test('三类存储与四组枚举字段都数得出来', () => {
  assert.strictEqual(A.stores.length, 3);
  assert.ok(A.stores.some((s) => s.includes('SQLite')) && A.stores.some((s) => s.includes('FTS5')), A.stores.join('/'));
  assert.deepStrictEqual(A.enumFields, ['证据等级', '六经', '桥接类型', '证候名']);
});

test('三条纪律写在正文里：空字段不倒推、枚举即契约、纯度不是准确率', () => {
  assert.strictEqual(A.noBackfill, true);
  assert.strictEqual(A.enumIsContract, true);
  assert.strictEqual(A.purityNotAccuracy, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('字段完整度'), '输出缺少完整度段落');
  assert.ok(out.includes('文档 ' + A.docCount + ' = 病证单元 ' + A.dsuDocs), '输出里的文档数与现算不一致');
});
