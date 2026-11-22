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

test('四个要素与正文表格一致', () => {
  const a = m.audit();
  assert.strictEqual(a.elementRows, 4);
  assert.deepStrictEqual(a.elements, m.ELEMENTS);
});

test('方案四栏齐，项目七行', () => {
  const a = m.audit();
  assert.strictEqual(a.planRows, 7);
  assert.deepStrictEqual(a.planColumns, ['项目', '做法', '量', '频次', '合格标准']);
});

test('三个数字与正文一致', () => {
  assert.deepStrictEqual(m.audit().numbers, [2, 2, 3]);
});

test('风险三层与八条自查', () => {
  const a = m.audit();
  assert.strictEqual(a.riskRows, 3);
  assert.deepStrictEqual(a.riskNames, m.RISK_TIERS);
  assert.strictEqual(a.selfChecks, 8);
});

test('四条边界写明', () => {
  const a = m.audit();
  assert.ok(a.fluorineStays);
  assert.ok(a.frequencyOverTotal);
  assert.ok(a.overuseHarmed);
  assert.ok(a.notTherapy);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
