'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, perCapita, headcount, extraBudgetWan } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '11-m11', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 11);
  assert.strictEqual(TITLE, '钱买到的是不反对，不是多做一点');
  assert.match(TEXT, /^# 第 11 章/);
});

test('汉字整数换算：一千二百、三千六百、三万', () => {
  assert.strictEqual(cnInt('一千二百'), 1200);
  assert.strictEqual(cnInt('三千六百'), 3600);
  assert.strictEqual(cnInt('三万'), 30000);
  assert.throws(() => cnInt('1200'), /认不出的中文数字/);
});

test('职工数、总额与三项比例都取自正文', () => {
  assert.strictEqual(F.staff, 1200);
  assert.strictEqual(F.totalWan, 3600);
  assert.strictEqual(F.perCapitaWan, 3);
  assert.strictEqual(F.indifferentPct, 62);
  assert.strictEqual(F.unreadablePct, 48);
  assert.strictEqual(F.willingPct, 71);
});

test('人均 3 万元，与正文一致', () => {
  assert.strictEqual(perCapita(F.totalWan, F.staff), 3);
  assert.strictEqual(perCapita(3600, 1200), F.perCapitaWan);
});

test('愿意多干的人多于认为差别不大的人，悖论可量化', () => {
  const willing = headcount(F.staff, F.willingPct);
  const indifferent = headcount(F.staff, F.indifferentPct);
  assert.strictEqual(willing, 852);
  assert.strictEqual(indifferent, 744);
  assert.ok(willing > indifferent, '意愿人数应高于「差别不大」人数');
  assert.ok(headcount(F.staff, F.unreadablePct) > 500);
});

test('多干两成需增加 720 万元，即总额的五分之一', () => {
  assert.strictEqual(extraBudgetWan(F.totalWan, 20), 720);
  assert.strictEqual(extraBudgetWan(F.totalWan, 20), F.totalWan * 0.2);
  assert.throws(() => headcount(1200, 120), /比例应在 0–100 之间/);
  assert.throws(() => perCapita(3600, 0), /人数必须为正/);
});

test('脚本可运行，输出三个数与三层线', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /三个数同时成立/);
  assert.match(out, /三层线/);
  assert.match(out, /现算/);
  assert.match(out, /不构成薪酬设计方案、绩效分配办法或人事处理依据/);
});
