'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, segregation, liveBorn, GAMETES } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '09-changjian-ranse-ti-bing', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 9);
  assert.strictEqual(TITLE, '染色体病的表型不是「某个基因坏了」，是「一整批基因的剂量偏了」');
  assert.ok(TEXT.startsWith('# 第 9 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 3159);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tables, 2);
});

test('每节都有字，逐节相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((n, s) => n + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('每个算式的结果都能对上正文写下的同一个数', () => {
  assert.ok(FIG.length >= 3, '算式太少：' + FIG.length);
  for (const f of FIG) {
    assert.ok(f.ok, `${f.name}：算得 ${f.got}，正文写 ${f.token}`);
    assert.ok(TEXT.includes(f.token), `正文里找不到 ${f.token}（${f.name}）`);
  }
});

test('六种配子的分配合计为六，不平衡占多数但不是全部', () => {
  const s = segregation;
  assert.strictEqual(s.normal + s.balanced + s.unbalanced, GAMETES);
  assert.ok(s.unbalanced > s.normal + s.balanced, '不平衡应占多数');
  assert.strictEqual(s.trisomyType, 1);
});

test('活产风险随存活概率线性下降，且永远不高于理论比数', () => {
  const r = segregation.trisomyType / GAMETES;
  let prev = Infinity;
  for (const s of [1, 0.5, 0.3, 0.1]) {
    const v = liveBorn(r, s);
    assert.ok(v <= r + 1e-12, '活产风险不应超过理论比数');
    assert.ok(v < prev, '存活概率下降，活产风险应下降');
    prev = v;
  }
});

test('剂量机制与再发风险三路在正文里都有对应', () => {
  for (const s of ['剂量敏感基因', '剂量补偿机制', '多数为新发', '理论配子比数 ≠ 活产风险']) {
    assert.ok(TEXT.includes(s), `正文里找不到「${s}」`);
  }
});


test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊断/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
});
