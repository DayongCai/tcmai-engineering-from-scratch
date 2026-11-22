'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, ladder, STEP, THRESHOLD } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-dan-jiyin-yichuanbing', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '单基因病的「单」，说的是传递单位，不是病因的单一性');
  assert.ok(TEXT.startsWith('# 第 5 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2899);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tables, 3);
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

test('携带者 × 携带者的三种基因型概率相加为 1', () => {
  const total = ['正常纯合', '携带者', '患者'].reduce((n, name) => n + FIG.find((f) => f.name === name).got, 0);
  assert.ok(Math.abs(total - 1) < 1e-12, String(total));
});

test('重复阶梯逐代递增，且只在跨过阈值之后才算致病', () => {
  const L = ladder();
  assert.deepStrictEqual(L.values, [30, 35, 40, 45]);
  for (let i = 1; i < L.values.length; i += 1) assert.strictEqual(L.values[i] - L.values[i - 1], STEP);
  assert.ok(L.crosses >= THRESHOLD, '跨阈的取值不应低于阈值');
  assert.ok(L.crosses - STEP < THRESHOLD, '跨阈前一个取值应仍在阈值下');
});

test('三处脱耦与干预层级在正文里都有对应表述', () => {
  for (const s of ['等位基因异质性', '外显不全与可变表现度', '方法学限度', '干预的对象往往不是基因']) {
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
