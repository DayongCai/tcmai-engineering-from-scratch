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

test('四个读数与正文表格一致', () => {
  const a = m.audit();
  assert.strictEqual(a.readingRows, 4);
  assert.deepStrictEqual(a.readings, m.READINGS);
});

test('全身相关情形六行，转诊八条', () => {
  const a = m.audit();
  assert.strictEqual(a.systemicRows, 6);
  assert.strictEqual(a.referralRows, 8);
});

test('牙宣四型都在正文里', () => {
  assert.deepStrictEqual(m.audit().patterns, m.PATTERNS);
});

test('四条纪律写明', () => {
  const a = m.audit();
  assert.ok(a.noScalingOnBleeding);
  assert.ok(a.readingMisleads);
  assert.ok(a.tappingLimit);
  assert.ok(a.notRootCure);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
