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

test('内治三法都在正文里', () => {
  assert.deepStrictEqual(m.audit().innerMethods, m.INNER_METHODS);
});

test('外治表四类，闸门表九条', () => {
  const a = m.audit();
  assert.strictEqual(a.outerRows, 4);
  assert.strictEqual(a.gateRows, 9);
  for (const name of a.outerMethods) assert.ok(m.OUTER_METHODS.includes(name), `陌生外治：${name}`);
});

test('复评五栏与三个阶段都在正文里', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.reviewColumns, m.REVIEW_COLUMNS);
  assert.deepStrictEqual(a.phases, m.PHASES);
});

test('两条边界判据写明', () => {
  const a = m.audit();
  assert.ok(a.rinseNotScaling);
  assert.ok(a.localWins);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
