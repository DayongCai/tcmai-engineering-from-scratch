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

test('正文可读，小节都在', () => {
  const a = m.audit();
  assert.ok(a.sections.length >= 6, `小节过少：${a.sections.length}`);
});

test('四件、两腔、三档关系、两个位置都齐', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.missing, []);
  assert.strictEqual(a.pieces.length, 4);
  assert.strictEqual(a.cavities.length, 2);
  assert.strictEqual(a.relations.length, 3);
  assert.strictEqual(a.positions.length, 2);
});

test('三档盘髁关系的出场次序与正文一致', () => {
  assert.ok(m.audit().orderOk, '正文次序与本章判据不符');
});

test('总纲「转动在下，滑动在上」成立', () => {
  assert.ok(m.audit().turnBelow, '正文没有把转动写在下腔、滑动写在上腔');
});

test('关键判断能在正文找到原句', () => {
  const doc = m.readDoc();
  for (const claim of m.CLAIMS) assert.ok(doc.includes(claim), `正文缺：${claim}`);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
