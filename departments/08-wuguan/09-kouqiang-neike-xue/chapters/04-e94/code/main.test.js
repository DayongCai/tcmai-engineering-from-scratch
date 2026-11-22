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

test('四步次序与正文小标题一致', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.steps, m.STEPS);
  assert.ok(a.stepsOk);
});

test('病位表六行，记录字段十二项', () => {
  const a = m.audit();
  assert.strictEqual(a.locationRows, 6);
  assert.strictEqual(a.fieldRows, 12);
});

test('六性都能在正文找到', () => {
  assert.deepStrictEqual(m.audit().sixNatures, m.SIX_NATURES);
});

test('最易漏的三项写明在正文', () => {
  assert.deepStrictEqual(m.audit().mustRecord, m.MUST_RECORD);
});

test('两栏并列与红旗优先都写明', () => {
  const a = m.audit();
  assert.ok(a.noEquation);
  assert.ok(a.redFlagFirst);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
