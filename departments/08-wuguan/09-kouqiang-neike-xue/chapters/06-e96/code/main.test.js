'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const m = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const CHAPTERS = path.join(__dirname, '..', '..', '..', 'chapters.json');

test('章节号与课程清单一致', () => {
  const list = JSON.parse(fs.readFileSync(CHAPTERS, 'utf8')).chapters;
  const row = list.find((c) => c.slug === m.SLUG);
  assert.ok(row, `chapters.json 里没有 ${m.SLUG}`);
  assert.strictEqual(row.n, m.CHAPTER);
  assert.strictEqual(m.audit().title, row.title);
});

test('五级阶梯与正文表格一致', () => {
  const a = m.audit();
  assert.strictEqual(a.ladderRows, 5);
  assert.deepStrictEqual(a.ladder, m.LADDER);
});

test('三处分界都能在正文找到', () => {
  assert.deepStrictEqual(m.audit().boundaries, m.BOUNDARIES);
});

test('六种不在牙上的痛与四种证型都在正文表格里', () => {
  const a = m.audit();
  assert.strictEqual(a.elsewhereRows, 6);
  assert.deepStrictEqual(a.elsewhere, m.ELSEWHERE);
  assert.deepStrictEqual(a.patterns, m.PATTERNS);
});

test('每一级都有处置去向', () => {
  for (const t of m.audit().treatmentCol) assert.ok(t && t.length > 0);
});

test('没有中药替代品与乳牙龋必须治都写明', () => {
  const a = m.audit();
  assert.ok(a.noSubstitute);
  assert.ok(a.deciduous);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
