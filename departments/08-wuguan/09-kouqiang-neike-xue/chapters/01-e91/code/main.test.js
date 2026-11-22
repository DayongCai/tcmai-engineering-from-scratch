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
  assert.ok(m.audit().sections.length >= 6, `小节过少：${m.audit().sections.length}`);
});

test('六步次序与正文一致', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.steps, m.STEPS);
  assert.ok(a.stepsOk, '正文的六步次序与本章判据不符');
});

test('分诊表四行，且归口都在正文里', () => {
  const a = m.audit();
  assert.strictEqual(a.triageRows, 4);
  assert.strictEqual(a.triageSurgical, 3);
  for (const to of a.triageTo) assert.ok(/外科|修复科/.test(to), `陌生归口：${to}`);
});

test('红旗清单与记录项都能在正文找到', () => {
  const a = m.audit();
  assert.deepStrictEqual(a.redFlags, m.RED_FLAGS);
  assert.deepStrictEqual(a.positions, m.POSITIONS);
  assert.deepStrictEqual(a.quantities, m.QUANTITIES);
});

test('脚本可运行且带边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /教学样例/);
  assert.match(r.stdout, /不构成临床判断依据/);
});
